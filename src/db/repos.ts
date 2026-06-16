import { db, obterConfig } from './db';
import type {
  Cliente,
  Emprestimo,
  FormaPagamento,
  Parcela,
  Periodicidade,
  SistemaCalculo,
} from '../types/modelos';
import { simular } from '../lib/finance/simulador';
import { converterTaxa } from '../lib/taxa';
import { novoId, hojeISO } from '../lib/id';
import { dataParaISO, isoParaData } from '../lib/datas';
import { calcularAtraso } from '../lib/atrasos';
import {
  abertoParcela,
  calcularRisco,
  resumoEmprestimo,
  statusDerivado,
} from '../lib/metricas';

/* ───────────────────────── Clientes ───────────────────────── */

export async function criarCliente(
  dados: Omit<Cliente, 'id' | 'risco' | 'criadoEm'>,
): Promise<string> {
  const id = novoId();
  const cliente: Cliente = {
    ...dados,
    id,
    risco: 'BOM',
    criadoEm: hojeISO(),
  };
  await db.clientes.add(cliente);
  return id;
}

export async function atualizarCliente(
  id: string,
  mudancas: Partial<Cliente>,
): Promise<void> {
  await db.clientes.update(id, mudancas);
}

export async function removerCliente(id: string): Promise<void> {
  const qtd = await db.emprestimos.where('clienteId').equals(id).count();
  if (qtd > 0) {
    throw new Error('Cliente possui empréstimos e não pode ser removido.');
  }
  await db.clientes.delete(id);
}

export async function recalcularRisco(clienteId: string): Promise<void> {
  const emprestimos = await db.emprestimos
    .where('clienteId')
    .equals(clienteId)
    .toArray();
  const ativos = emprestimos.filter(
    (e) => e.status !== 'CANCELADO' && e.status !== 'RENEGOCIADO',
  );
  const parcelas: Parcela[] = [];
  for (const e of ativos) {
    parcelas.push(
      ...(await db.parcelas.where('emprestimoId').equals(e.id).toArray()),
    );
  }
  const risco = calcularRisco(parcelas, hojeISO());
  await db.clientes.update(clienteId, { risco });
}

/* ───────────────────────── Empréstimos ───────────────────────── */

export interface NovoEmprestimoInput {
  clienteId: string;
  principal: number; // centavos
  taxaPercent: number;
  periodicidadeTaxa: Periodicidade;
  sistema: SistemaCalculo;
  numeroParcelas: number;
  frequencia: Periodicidade;
  dataEmprestimoISO: string;
  dataPrimeiraParcelaISO?: string;
  multaAtraso: number;
  jurosMoraDia: number;
  observacoes?: string;
  comprovante?: string;
  emprestimoOrigemId?: string;
  semMovimentoCaixa?: boolean; // renegociação não movimenta caixa
}

export async function criarEmprestimo(
  input: NovoEmprestimoInput,
): Promise<string> {
  const taxaPorParcela = converterTaxa(
    input.taxaPercent,
    input.periodicidadeTaxa,
    input.frequencia,
  );

  const resultado = simular({
    principal: input.principal,
    taxaPercent: taxaPorParcela,
    numParcelas: input.numeroParcelas,
    sistema: input.sistema,
    frequencia: input.frequencia,
    dataEmprestimo: isoParaData(input.dataEmprestimoISO),
    dataPrimeiraParcela: input.dataPrimeiraParcelaISO
      ? isoParaData(input.dataPrimeiraParcelaISO)
      : undefined,
  });

  const empId = novoId();
  const agora = hojeISO();

  const emprestimo: Emprestimo = {
    id: empId,
    clienteId: input.clienteId,
    valorPrincipal: input.principal,
    taxaJuros: input.taxaPercent,
    periodicidadeTaxa: input.periodicidadeTaxa,
    sistemaCalculo: input.sistema,
    numeroParcelas: input.numeroParcelas,
    frequenciaPagamento: input.frequencia,
    dataEmprestimo: input.dataEmprestimoISO,
    dataPrimeiraParcela: dataParaISO(resultado.parcelas[0].vencimento),
    multaAtraso: input.multaAtraso,
    jurosMoraDia: input.jurosMoraDia,
    status: 'EM_DIA',
    totalAReceber: resultado.totalAReceber,
    totalJuros: resultado.totalJuros,
    saldoDevedor: input.principal,
    observacoes: input.observacoes,
    comprovante: input.comprovante,
    emprestimoOrigemId: input.emprestimoOrigemId,
    criadoEm: agora,
  };

  const parcelas: Parcela[] = resultado.parcelas.map((l) => ({
    id: novoId(),
    emprestimoId: empId,
    numero: l.numero,
    dataVencimento: dataParaISO(l.vencimento),
    valorParcela: l.parcela,
    valorJuros: l.juros,
    valorAmortizacao: l.amortizacao,
    saldoApos: l.saldo,
    valorPago: 0,
    multaAplicada: 0,
    moraAplicada: 0,
    status: 'PENDENTE',
  }));

  await db.transaction(
    'rw',
    db.emprestimos,
    db.parcelas,
    db.movimentos,
    db.clientes,
    async () => {
      await db.emprestimos.add(emprestimo);
      await db.parcelas.bulkAdd(parcelas);
      if (!input.semMovimentoCaixa) {
        await db.movimentos.add({
          id: novoId(),
          tipo: 'SAIDA',
          valor: input.principal,
          data: input.dataEmprestimoISO,
          referenciaTipo: 'EMPRESTIMO',
          referenciaId: empId,
          descricao: 'Empréstimo concedido',
        });
      }
      await recalcularRisco(input.clienteId);
    },
  );

  return empId;
}

/** Recalcula status e saldo devedor de um empréstimo a partir das parcelas. */
async function atualizarDerivados(empId: string): Promise<void> {
  const emp = await db.emprestimos.get(empId);
  if (!emp) return;
  const parcelas = await db.parcelas.where('emprestimoId').equals(empId).toArray();
  const resumo = resumoEmprestimo(emp, parcelas);
  const status = statusDerivado(emp, parcelas, hojeISO());
  await db.emprestimos.update(empId, {
    status,
    saldoDevedor: resumo.principalEmAberto,
  });
}

export async function cancelarEmprestimo(empId: string): Promise<void> {
  const emp = await db.emprestimos.get(empId);
  if (!emp) return;
  await db.transaction('rw', db.emprestimos, db.movimentos, db.clientes, async () => {
    await db.emprestimos.update(empId, { status: 'CANCELADO' });
    // Estorna a saída de caixa do principal (cancelamento desfaz a entrega).
    await db.movimentos.add({
      id: novoId(),
      tipo: 'ENTRADA',
      valor: emp.valorPrincipal,
      data: hojeISO(),
      referenciaTipo: 'AJUSTE',
      referenciaId: empId,
      descricao: 'Estorno por cancelamento de empréstimo',
    });
    await recalcularRisco(emp.clienteId);
  });
}

/* ───────────────────────── Pagamentos / Recebimentos ───────────────────────── */

export interface RegistrarPagamentoInput {
  parcelaId: string;
  valor: number; // centavos
  forma: FormaPagamento;
  dataISO?: string;
  observacao?: string;
}

export async function registrarPagamento(
  input: RegistrarPagamentoInput,
): Promise<void> {
  const data = input.dataISO ?? hojeISO();
  const parcela = await db.parcelas.get(input.parcelaId);
  if (!parcela) throw new Error('Parcela não encontrada.');

  const novoPago = parcela.valorPago + input.valor;
  const quitada = novoPago >= parcela.valorParcela;

  await db.transaction(
    'rw',
    [db.parcelas, db.pagamentos, db.movimentos, db.emprestimos, db.clientes],
    async () => {
      await db.parcelas.update(input.parcelaId, {
        valorPago: novoPago,
        status: quitada ? 'PAGA' : 'PARCIAL',
        dataPagamento: quitada ? data : parcela.dataPagamento,
      });
      await db.pagamentos.add({
        id: novoId(),
        emprestimoId: parcela.emprestimoId,
        parcelaId: parcela.id,
        valor: input.valor,
        data,
        forma: input.forma,
        reciboGerado: false,
        observacao: input.observacao,
      });
      await db.movimentos.add({
        id: novoId(),
        tipo: 'ENTRADA',
        valor: input.valor,
        data,
        referenciaTipo: 'PAGAMENTO',
        referenciaId: parcela.emprestimoId,
        descricao: `Recebimento parcela ${parcela.numero}`,
      });
      await atualizarDerivados(parcela.emprestimoId);
      const emp = await db.emprestimos.get(parcela.emprestimoId);
      if (emp) await recalcularRisco(emp.clienteId);
    },
  );
}

/** Calcula quanto o cliente paga para quitar agora (com/sem desconto de juros futuros). */
export async function calcularQuitacao(empId: string): Promise<{
  comDesconto: boolean;
  valor: number;
  totalSemDesconto: number;
  principalEmAberto: number;
}> {
  const emp = await db.emprestimos.get(empId);
  if (!emp) throw new Error('Empréstimo não encontrado.');
  const parcelas = await db.parcelas.where('emprestimoId').equals(empId).toArray();
  const config = await obterConfig();

  const pendentes = parcelas.filter((p) => p.status !== 'PAGA');
  const somaAberto = pendentes.reduce((s, p) => s + abertoParcela(p), 0);
  const resumo = resumoEmprestimo(emp, parcelas);

  const totalSemDesconto =
    emp.sistemaCalculo === 'SO_JUROS'
      ? somaAberto + emp.valorPrincipal
      : somaAberto;

  const valor = config.descontoQuitacaoAntecipada
    ? resumo.principalEmAberto
    : totalSemDesconto;

  return {
    comDesconto: config.descontoQuitacaoAntecipada,
    valor,
    totalSemDesconto,
    principalEmAberto: resumo.principalEmAberto,
  };
}

export async function quitarAntecipado(
  empId: string,
  forma: FormaPagamento,
  dataISO?: string,
): Promise<void> {
  const data = dataISO ?? hojeISO();
  const emp = await db.emprestimos.get(empId);
  if (!emp) throw new Error('Empréstimo não encontrado.');
  const { valor, comDesconto } = await calcularQuitacao(empId);
  const parcelas = await db.parcelas.where('emprestimoId').equals(empId).toArray();
  const pendentes = parcelas.filter((p) => p.status !== 'PAGA');

  await db.transaction(
    'rw',
    [db.parcelas, db.pagamentos, db.movimentos, db.emprestimos, db.clientes],
    async () => {
      for (const p of pendentes) {
        await db.parcelas.update(p.id, {
          valorPago: p.valorParcela,
          status: 'PAGA',
          dataPagamento: data,
        });
      }
      await db.pagamentos.add({
        id: novoId(),
        emprestimoId: empId,
        valor,
        data,
        forma,
        reciboGerado: false,
        observacao: comDesconto
          ? 'Quitação antecipada (com desconto de juros futuros)'
          : 'Quitação antecipada',
      });
      await db.movimentos.add({
        id: novoId(),
        tipo: 'ENTRADA',
        valor,
        data,
        referenciaTipo: 'PAGAMENTO',
        referenciaId: empId,
        descricao: 'Quitação antecipada',
      });
      await db.emprestimos.update(empId, { status: 'QUITADO', saldoDevedor: 0 });
      await recalcularRisco(emp.clienteId);
    },
  );
}

/* ───────────────────────── Renegociação (regra 7) ───────────────────────── */

export interface RenegociacaoInput {
  emprestimoOrigemId: string;
  novoPrincipal: number;
  taxaPercent: number;
  periodicidadeTaxa: Periodicidade;
  sistema: SistemaCalculo;
  numeroParcelas: number;
  frequencia: Periodicidade;
  dataEmprestimoISO: string;
  dataPrimeiraParcelaISO?: string;
  multaAtraso: number;
  jurosMoraDia: number;
}

/** Sugere o saldo a renegociar = total em aberto (parcelas pendentes). */
export async function sugestaoSaldoRenegociacao(empId: string): Promise<number> {
  const emp = await db.emprestimos.get(empId);
  const parcelas = await db.parcelas.where('emprestimoId').equals(empId).toArray();
  const somaAberto = parcelas
    .filter((p) => p.status !== 'PAGA')
    .reduce((s, p) => s + abertoParcela(p), 0);
  if (emp?.sistemaCalculo === 'SO_JUROS') return somaAberto + emp.valorPrincipal;
  return somaAberto;
}

export async function renegociarEmprestimo(
  input: RenegociacaoInput,
): Promise<string> {
  const origem = await db.emprestimos.get(input.emprestimoOrigemId);
  if (!origem) throw new Error('Empréstimo de origem não encontrado.');

  const novoId = await criarEmprestimo({
    clienteId: origem.clienteId,
    principal: input.novoPrincipal,
    taxaPercent: input.taxaPercent,
    periodicidadeTaxa: input.periodicidadeTaxa,
    sistema: input.sistema,
    numeroParcelas: input.numeroParcelas,
    frequencia: input.frequencia,
    dataEmprestimoISO: input.dataEmprestimoISO,
    dataPrimeiraParcelaISO: input.dataPrimeiraParcelaISO,
    multaAtraso: input.multaAtraso,
    jurosMoraDia: input.jurosMoraDia,
    observacoes: `Renegociação do empréstimo ${origem.id.slice(0, 8)}`,
    emprestimoOrigemId: origem.id,
    semMovimentoCaixa: true,
  });

  await db.emprestimos.update(origem.id, { status: 'RENEGOCIADO' });
  return novoId;
}

/* ───────────────────────── Varredura de atrasos ───────────────────────── */

/**
 * Marca parcelas vencidas como ATRASADA, aplica multa+mora e recalcula
 * status dos empréstimos. Roda na abertura do app e após operações.
 */
export async function atualizarAtrasos(): Promise<void> {
  const hoje = hojeISO();
  const emprestimos = await db.emprestimos.toArray();
  const ativos = emprestimos.filter(
    (e) =>
      e.status !== 'QUITADO' &&
      e.status !== 'CANCELADO' &&
      e.status !== 'RENEGOCIADO',
  );

  for (const emp of ativos) {
    const parcelas = await db.parcelas
      .where('emprestimoId')
      .equals(emp.id)
      .toArray();

    for (const p of parcelas) {
      if (p.status === 'PAGA') continue;
      const atraso = calcularAtraso(p, emp, hoje);
      if (atraso.emAtraso) {
        await db.parcelas.update(p.id, {
          status: 'ATRASADA',
          multaAplicada: atraso.multa,
          moraAplicada: atraso.mora,
        });
      } else if (p.status === 'ATRASADA') {
        // Deixou de estar em atraso (ex.: data corrigida): volta a pendente.
        await db.parcelas.update(p.id, {
          status: p.valorPago > 0 ? 'PARCIAL' : 'PENDENTE',
          multaAplicada: 0,
          moraAplicada: 0,
        });
      }
    }
    await atualizarDerivados(emp.id);
    await recalcularRisco(emp.clienteId);
  }
}
