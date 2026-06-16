import type { Emprestimo, Parcela, RiscoCliente } from '../types/modelos';
import { diffDiasISO } from './datas';

/** Valor ainda em aberto de uma parcela (centavos). */
export function abertoParcela(p: Parcela): number {
  return Math.max(0, p.valorParcela - p.valorPago);
}

/** Fração paga da parcela (0..1). */
export function fracaoPaga(p: Parcela): number {
  if (p.valorParcela <= 0) return 0;
  return Math.min(1, p.valorPago / p.valorParcela);
}

/** Juros já recebidos desta parcela (proporcional ao que foi pago). */
export function jurosRecebido(p: Parcela): number {
  return Math.round(p.valorJuros * fracaoPaga(p));
}

/** Amortização (principal) já recuperada desta parcela. */
export function amortRecuperada(p: Parcela): number {
  return Math.round(p.valorAmortizacao * fracaoPaga(p));
}

export interface ResumoEmprestimo {
  totalContratado: number; // soma das parcelas
  recebido: number; // soma do que foi pago
  aReceber: number; // total contratado - recebido
  jurosRecebido: number; // lucro realizado
  principalEmAberto: number; // principal ainda não recuperado
  parcelasPagas: number;
  parcelasTotais: number;
  proximaParcela?: Parcela; // próxima pendente/atrasada por vencimento
}

export function resumoEmprestimo(
  emp: Emprestimo,
  parcelas: Parcela[],
): ResumoEmprestimo {
  const ordenadas = [...parcelas].sort((a, b) => a.numero - b.numero);
  let totalContratado = 0;
  let recebido = 0;
  let juros = 0;
  let amort = 0;
  let pagas = 0;

  for (const p of ordenadas) {
    totalContratado += p.valorParcela;
    recebido += p.valorPago;
    juros += jurosRecebido(p);
    amort += amortRecuperada(p);
    if (p.status === 'PAGA') pagas++;
  }

  const ativo = emp.status === 'EM_DIA' || emp.status === 'ATRASADO';

  // SO_JUROS: o principal só sai na quitação, então não é "recuperado" pelas parcelas.
  const principalEmAberto =
    emp.sistemaCalculo === 'SO_JUROS'
      ? ativo
        ? emp.valorPrincipal
        : 0
      : Math.max(0, emp.valorPrincipal - amort);

  // No rotativo, o principal ainda volta — então entra no "a receber".
  const principalRotativo =
    emp.sistemaCalculo === 'SO_JUROS' && ativo ? emp.valorPrincipal : 0;

  const proximaParcela = ordenadas.find(
    (p) => p.status !== 'PAGA' && abertoParcela(p) > 0,
  );

  return {
    totalContratado,
    recebido,
    aReceber: Math.max(0, totalContratado - recebido) + principalRotativo,
    jurosRecebido: juros,
    principalEmAberto,
    parcelasPagas: pagas,
    parcelasTotais: ordenadas.length,
    proximaParcela,
  };
}

/** Principal do rotativo (SO_JUROS) que ainda voltará, fora das parcelas. */
export function principalRotativoAberto(emp: Emprestimo): number {
  if (emp.sistemaCalculo !== 'SO_JUROS') return 0;
  return emp.status === 'EM_DIA' || emp.status === 'ATRASADO'
    ? emp.valorPrincipal
    : 0;
}

/** Status do empréstimo derivado das parcelas (regra 8.3). */
export function statusDerivado(
  emp: Emprestimo,
  parcelas: Parcela[],
  hojeISO: string,
): Emprestimo['status'] {
  if (emp.status === 'RENEGOCIADO' || emp.status === 'CANCELADO') {
    return emp.status;
  }
  const todasPagas =
    parcelas.length > 0 && parcelas.every((p) => p.status === 'PAGA');
  if (todasPagas) return 'QUITADO';

  const temAtrasada = parcelas.some(
    (p) =>
      p.status !== 'PAGA' &&
      abertoParcela(p) > 0 &&
      diffDiasISO(p.dataVencimento, hojeISO) > 0,
  );
  return temAtrasada ? 'ATRASADO' : 'EM_DIA';
}

/**
 * Selo de pagador (regra 8.4), recalculado pelo histórico:
 *  - ATENCAO: tem parcela atrasada agora.
 *  - REGULAR: pagou parcelas, mas mais de 30% com atraso.
 *  - BOM: em dia / sem histórico de atraso relevante.
 */
export function calcularRisco(parcelas: Parcela[], hojeISO: string): RiscoCliente {
  const atrasadaAgora = parcelas.some(
    (p) =>
      p.status !== 'PAGA' &&
      abertoParcela(p) > 0 &&
      diffDiasISO(p.dataVencimento, hojeISO) > 0,
  );
  if (atrasadaAgora) return 'ATENCAO';

  const pagas = parcelas.filter((p) => p.status === 'PAGA' && p.dataPagamento);
  if (pagas.length === 0) return 'BOM';
  const comAtraso = pagas.filter(
    (p) => diffDiasISO(p.dataVencimento, p.dataPagamento!) > 0,
  ).length;
  return comAtraso / pagas.length > 0.3 ? 'REGULAR' : 'BOM';
}
