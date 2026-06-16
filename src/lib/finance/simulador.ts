import Decimal from 'decimal.js';
import type { Periodicidade, SistemaCalculo } from '../../types/modelos';

/**
 * MOTOR DE CÁLCULO DO SIMULADOR (seção 6.1)
 *
 * Tudo é calculado em CENTAVOS INTEIROS. Usamos Decimal.js apenas para as
 * contas intermediárias (potências fracionárias da Price, multiplicações por
 * taxa) e arredondamos cada parcela para o centavo, jogando a sobra de
 * centavos na ÚLTIMA parcela para o saldo fechar exatamente em 0,00 (regra 8.2).
 *
 * Exceção: SO_JUROS (rotativo) não amortiza o principal — o saldo permanece
 * aberto até a quitação, então não há "fechamento em zero".
 */

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export interface ParametrosSimulacao {
  /** Valor principal emprestado, em centavos inteiros. */
  principal: number;
  /** Taxa de juros por período, em % (ex.: 10 para 10%). */
  taxaPercent: number;
  /** Número de parcelas. */
  numParcelas: number;
  sistema: SistemaCalculo;
  frequencia: Periodicidade;
  /** Data do empréstimo. */
  dataEmprestimo: Date;
  /** Data da 1ª parcela. Se omitida, = dataEmprestimo + 1 período. */
  dataPrimeiraParcela?: Date;
}

export interface LinhaAmortizacao {
  numero: number;
  vencimento: Date;
  juros: number; // centavos
  amortizacao: number; // centavos
  parcela: number; // centavos
  saldo: number; // saldo devedor após pagar esta parcela (centavos)
}

export interface ResultadoSimulacao {
  sistema: SistemaCalculo;
  principal: number; // centavos
  parcelas: LinhaAmortizacao[];
  totalJuros: number; // centavos (lucro previsto)
  totalAReceber: number; // centavos (principal + juros)
  /** Valor da parcela quando o sistema gera parcela fixa; null se variável (SAC). */
  parcelaFixa: number | null;
  taxaPeriodo: number; // i em decimal (0.10)
  /** Taxa efetiva por período calculada pela TIR do fluxo de caixa. */
  taxaEfetivaPeriodo: number;
  /** Custo Efetivo Total aproximado, anualizado. */
  cetAnual: number;
  /** Texto explicativo para o sistema rotativo (SO_JUROS). */
  observacao?: string;
}

/* ───────────────────────── Datas ───────────────────────── */

const DIAS_POR_PERIODO: Record<Periodicidade, number> = {
  DIARIA: 1,
  SEMANAL: 7,
  QUINZENAL: 15,
  MENSAL: 0, // tratado à parte (soma de mês de calendário)
};

const PERIODOS_POR_ANO: Record<Periodicidade, number> = {
  DIARIA: 365,
  SEMANAL: 52,
  QUINZENAL: 24,
  MENSAL: 12,
};

export function adicionarPeriodos(
  base: Date,
  freq: Periodicidade,
  quantidade: number,
): Date {
  const d = new Date(base.getTime());
  if (freq === 'MENSAL') {
    const diaOriginal = d.getDate();
    d.setMonth(d.getMonth() + quantidade);
    // Corrige overflow (ex.: 31/jan + 1 mês não vira 03/mar)
    if (d.getDate() < diaOriginal) {
      d.setDate(0);
    }
    return d;
  }
  d.setDate(d.getDate() + DIAS_POR_PERIODO[freq] * quantidade);
  return d;
}

function vencimentoParcela(p: ParametrosSimulacao, numero: number): Date {
  const primeira =
    p.dataPrimeiraParcela ?? adicionarPeriodos(p.dataEmprestimo, p.frequencia, 1);
  return adicionarPeriodos(primeira, p.frequencia, numero - 1);
}

/* ───────────────────────── Helpers numéricos ───────────────────────── */

/** Arredonda um Decimal (em centavos) para o centavo inteiro mais próximo. */
function centavos(d: Decimal): number {
  return d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Taxa Interna de Retorno por período (TIR), por bisseção.
 * Fluxo: saída -principal em t=0, entradas `fluxos[k]` em t=1..n.
 * Retorna a taxa por período (decimal). NaN se não convergir.
 */
function tir(principal: number, fluxos: number[]): number {
  const vpl = (r: number) =>
    fluxos.reduce((acc, c, idx) => acc + c / Math.pow(1 + r, idx + 1), 0) -
    principal;

  let lo = -0.9999;
  let hi = 100; // até 10.000% por período, cobre juros altos do informal
  let vLo = vpl(lo);
  let vHi = vpl(hi);
  if (Number.isNaN(vLo) || Number.isNaN(vHi) || vLo * vHi > 0) return NaN;

  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const vMid = vpl(mid);
    if (Math.abs(vMid) < 1e-7) return mid;
    if (vLo * vMid < 0) {
      hi = mid;
      vHi = vMid;
    } else {
      lo = mid;
      vLo = vMid;
    }
  }
  return (lo + hi) / 2;
}

function indicadoresEfetivos(
  p: ParametrosSimulacao,
  fluxos: number[],
): { taxaEfetivaPeriodo: number; cetAnual: number } {
  const taxa = tir(p.principal, fluxos);
  if (Number.isNaN(taxa)) {
    return { taxaEfetivaPeriodo: 0, cetAnual: 0 };
  }
  const cetAnual = Math.pow(1 + taxa, PERIODOS_POR_ANO[p.frequencia]) - 1;
  return { taxaEfetivaPeriodo: taxa, cetAnual };
}

/* ───────────────────────── Sistemas de cálculo ───────────────────────── */

function calcularJurosSimples(
  p: ParametrosSimulacao,
  i: Decimal,
): LinhaAmortizacao[] {
  const PV = new Decimal(p.principal);
  const n = p.numParcelas;

  const montante = PV.times(new Decimal(1).plus(i.times(n)));
  const parcelaBase = centavos(montante.div(n));
  const amortBase = centavos(PV.div(n));

  const linhas: LinhaAmortizacao[] = [];
  let saldo = p.principal;
  let amortAcumulada = 0;
  let pagoAcumulado = 0;
  const montanteInt = centavos(montante);

  for (let k = 1; k <= n; k++) {
    let parcela: number;
    let amortizacao: number;
    if (k < n) {
      parcela = parcelaBase;
      amortizacao = amortBase;
    } else {
      // Última parcela absorve a sobra de centavos (regra 8.2)
      parcela = montanteInt - pagoAcumulado;
      amortizacao = p.principal - amortAcumulada;
    }
    const juros = parcela - amortizacao;
    saldo -= amortizacao;
    amortAcumulada += amortizacao;
    pagoAcumulado += parcela;
    linhas.push({
      numero: k,
      vencimento: vencimentoParcela(p, k),
      juros,
      amortizacao,
      parcela,
      saldo: Math.max(saldo, 0),
    });
  }
  return linhas;
}

function calcularPrice(p: ParametrosSimulacao, i: Decimal): LinhaAmortizacao[] {
  const PV = new Decimal(p.principal);
  const n = p.numParcelas;

  let pmtInt: number;
  if (i.isZero()) {
    pmtInt = centavos(PV.div(n));
  } else {
    const fator = new Decimal(1).plus(i).pow(-n); // (1+i)^(-n)
    const pmt = PV.times(i).div(new Decimal(1).minus(fator));
    pmtInt = centavos(pmt);
  }

  const linhas: LinhaAmortizacao[] = [];
  let saldo = p.principal;

  for (let k = 1; k <= n; k++) {
    const juros = centavos(new Decimal(saldo).times(i));
    let amortizacao: number;
    let parcela: number;
    if (k < n) {
      parcela = pmtInt;
      amortizacao = parcela - juros;
    } else {
      // Última: amortiza todo o saldo restante; parcela = saldo + juros
      amortizacao = saldo;
      parcela = saldo + juros;
    }
    saldo -= amortizacao;
    linhas.push({
      numero: k,
      vencimento: vencimentoParcela(p, k),
      juros,
      amortizacao,
      parcela,
      saldo: Math.max(saldo, 0),
    });
  }
  return linhas;
}

function calcularSAC(p: ParametrosSimulacao, i: Decimal): LinhaAmortizacao[] {
  const PV = new Decimal(p.principal);
  const n = p.numParcelas;
  const amortBase = centavos(PV.div(n));

  const linhas: LinhaAmortizacao[] = [];
  let saldo = p.principal;

  for (let k = 1; k <= n; k++) {
    const juros = centavos(new Decimal(saldo).times(i));
    // Última amortização absorve a sobra para fechar o saldo em zero
    const amortizacao = k < n ? amortBase : saldo;
    const parcela = amortizacao + juros;
    saldo -= amortizacao;
    linhas.push({
      numero: k,
      vencimento: vencimentoParcela(p, k),
      juros,
      amortizacao,
      parcela,
      saldo: Math.max(saldo, 0),
    });
  }
  return linhas;
}

function calcularSoJuros(p: ParametrosSimulacao, i: Decimal): LinhaAmortizacao[] {
  const n = p.numParcelas;
  const jurosPeriodo = centavos(new Decimal(p.principal).times(i));

  const linhas: LinhaAmortizacao[] = [];
  for (let k = 1; k <= n; k++) {
    // Paga só os juros; o principal (saldo) permanece aberto.
    linhas.push({
      numero: k,
      vencimento: vencimentoParcela(p, k),
      juros: jurosPeriodo,
      amortizacao: 0,
      parcela: jurosPeriodo,
      saldo: p.principal,
    });
  }
  return linhas;
}

/* ───────────────────────── Orquestrador ───────────────────────── */

export function simular(p: ParametrosSimulacao): ResultadoSimulacao {
  if (p.principal <= 0) throw new Error('Valor principal deve ser maior que zero.');
  if (p.numParcelas <= 0) throw new Error('Número de parcelas deve ser maior que zero.');

  const i = new Decimal(p.taxaPercent).div(100);

  let parcelas: LinhaAmortizacao[];
  switch (p.sistema) {
    case 'JUROS_SIMPLES':
      parcelas = calcularJurosSimples(p, i);
      break;
    case 'PRICE':
      parcelas = calcularPrice(p, i);
      break;
    case 'SAC':
      parcelas = calcularSAC(p, i);
      break;
    case 'SO_JUROS':
      parcelas = calcularSoJuros(p, i);
      break;
  }

  const totalJuros = parcelas.reduce((s, l) => s + l.juros, 0);

  let totalAReceber: number;
  let observacao: string | undefined;
  let fluxos: number[];

  if (p.sistema === 'SO_JUROS') {
    // Recebe n períodos de juros + o principal na quitação.
    totalAReceber = p.principal + totalJuros;
    observacao =
      'Sistema rotativo: o cliente paga apenas os juros por período e o ' +
      'principal permanece em aberto até a quitação. O "total a receber" ' +
      'assume a quitação após o último período simulado.';
    // Fluxo para a TIR: juros em t=1..n e principal devolvido em t=n.
    fluxos = parcelas.map((l) => l.parcela);
    fluxos[fluxos.length - 1] += p.principal;
  } else {
    totalAReceber = parcelas.reduce((s, l) => s + l.parcela, 0);
    fluxos = parcelas.map((l) => l.parcela);
  }

  const parcelaFixa =
    p.sistema === 'SAC'
      ? null
      : p.sistema === 'SO_JUROS'
        ? parcelas[0]?.parcela ?? 0
        : parcelas[0]?.parcela ?? 0;

  const { taxaEfetivaPeriodo, cetAnual } = indicadoresEfetivos(p, fluxos);

  return {
    sistema: p.sistema,
    principal: p.principal,
    parcelas,
    totalJuros,
    totalAReceber,
    parcelaFixa,
    taxaPeriodo: i.toNumber(),
    taxaEfetivaPeriodo,
    cetAnual,
    observacao,
  };
}

/* ───────────────────────── Rótulos para a UI ───────────────────────── */

export const ROTULO_SISTEMA: Record<SistemaCalculo, string> = {
  JUROS_SIMPLES: 'Juros Simples',
  PRICE: 'Tabela Price',
  SAC: 'SAC',
  SO_JUROS: 'Só Juros (rotativo)',
};

export const ROTULO_FREQUENCIA: Record<Periodicidade, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
};
