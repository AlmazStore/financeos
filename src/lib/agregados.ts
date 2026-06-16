import type {
  Cliente,
  Emprestimo,
  MovimentoCaixa,
  Parcela,
} from '../types/modelos';
import { abertoParcela, jurosRecebido, principalRotativoAberto } from './metricas';
import { diffDiasISO } from './datas';

const ATIVO = (e: Emprestimo) =>
  e.status === 'EM_DIA' || e.status === 'ATRASADO';

/* ───────────────────────── Resumo por cliente ───────────────────────── */

export interface ResumoCliente {
  totalEmprestado: number; // principal de empréstimos ativos
  totalEmAberto: number; // a receber de empréstimos ativos
  emprestimosAtivos: number;
}

export function resumoCliente(
  clienteId: string,
  emprestimos: Emprestimo[],
  parcelas: Parcela[],
): ResumoCliente {
  const doCliente = emprestimos.filter(
    (e) => e.clienteId === clienteId && ATIVO(e),
  );
  const ids = new Set(doCliente.map((e) => e.id));
  const parcelasCliente = parcelas.filter((p) => ids.has(p.emprestimoId));
  const principalRotativo = doCliente.reduce(
    (s, e) => s + principalRotativoAberto(e),
    0,
  );
  return {
    totalEmprestado: doCliente.reduce((s, e) => s + e.valorPrincipal, 0),
    totalEmAberto:
      parcelasCliente.reduce((s, p) => s + abertoParcela(p), 0) + principalRotativo,
    emprestimosAtivos: doCliente.length,
  };
}

/* ───────────────────────── Carteira (dashboard) ───────────────────────── */

export interface ResumoCarteira {
  capitalNaRua: number; // principal em aberto dos ativos
  totalRecebido: number; // entradas de pagamento
  lucro: number; // juros recebidos
  aReceber: number; // soma do aberto dos ativos
  clientesEmDia: number;
  clientesAtrasados: number;
  qtdAtivos: number;
}

export function resumoCarteira(
  emprestimos: Emprestimo[],
  parcelas: Parcela[],
): ResumoCarteira {
  const ativos = emprestimos.filter(ATIVO);
  const idsAtivos = new Set(ativos.map((e) => e.id));
  const parcelasAtivas = parcelas.filter((p) => idsAtivos.has(p.emprestimoId));

  const capitalNaRua = ativos.reduce((s, e) => s + e.saldoDevedor, 0);
  const principalRotativo = ativos.reduce(
    (s, e) => s + principalRotativoAberto(e),
    0,
  );
  const aReceber =
    parcelasAtivas.reduce((s, p) => s + abertoParcela(p), 0) + principalRotativo;
  // Lucro e recebido valem para TODO o histórico (inclui quitados).
  const lucro = parcelas.reduce((s, p) => s + jurosRecebido(p), 0);
  const totalRecebido = parcelas.reduce((s, p) => s + p.valorPago, 0);

  const clientesAtrasados = new Set(
    emprestimos.filter((e) => e.status === 'ATRASADO').map((e) => e.clienteId),
  );
  const clientesEmDia = new Set(
    emprestimos
      .filter((e) => e.status === 'EM_DIA')
      .map((e) => e.clienteId),
  );
  for (const id of clientesAtrasados) clientesEmDia.delete(id);

  return {
    capitalNaRua,
    totalRecebido,
    lucro,
    aReceber,
    clientesEmDia: clientesEmDia.size,
    clientesAtrasados: clientesAtrasados.size,
    qtdAtivos: ativos.length,
  };
}

/* ───────────────────────── Vencimentos ───────────────────────── */

export interface ItemVencimento {
  parcela: Parcela;
  emprestimo: Emprestimo;
  cliente?: Cliente;
  diasAtraso: number; // >0 atrasada; 0 vence hoje/futuro
}

export function vencimentos(
  emprestimos: Emprestimo[],
  parcelas: Parcela[],
  clientes: Cliente[],
  hojeISO: string,
): {
  hoje: ItemVencimento[];
  atrasadas: ItemVencimento[];
  proximos7: ItemVencimento[];
} {
  const ativos = new Map(emprestimos.filter(ATIVO).map((e) => [e.id, e]));
  const mapaCliente = new Map(clientes.map((c) => [c.id, c]));
  const hoje: ItemVencimento[] = [];
  const atrasadas: ItemVencimento[] = [];
  const proximos7: ItemVencimento[] = [];

  for (const p of parcelas) {
    const emp = ativos.get(p.emprestimoId);
    if (!emp) continue;
    if (p.status === 'PAGA' || abertoParcela(p) <= 0) continue;
    const dias = diffDiasISO(p.dataVencimento, hojeISO); // >0 atrasada
    const item: ItemVencimento = {
      parcela: p,
      emprestimo: emp,
      cliente: mapaCliente.get(emp.clienteId),
      diasAtraso: Math.max(0, dias),
    };
    if (dias > 0) atrasadas.push(item);
    else if (dias === 0) hoje.push(item);
    else if (dias >= -7) proximos7.push(item);
  }

  const porData = (a: ItemVencimento, b: ItemVencimento) =>
    a.parcela.dataVencimento.localeCompare(b.parcela.dataVencimento);
  atrasadas.sort((a, b) => b.diasAtraso - a.diasAtraso);
  hoje.sort(porData);
  proximos7.sort(porData);
  return { hoje, atrasadas, proximos7 };
}

/* ───────────────────────── Séries mensais (gráficos) ───────────────────────── */

export interface PontoMensal {
  mes: string; // "MM/AA"
  recebido: number; // reais
  lucro: number; // reais
}

export function seriesMensais(
  parcelas: Parcela[],
  movimentos: MovimentoCaixa[],
  meses = 6,
): PontoMensal[] {
  const agora = new Date();
  const chaves: string[] = [];
  const indice = new Map<string, number>();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    indice.set(chave, chaves.length);
    chaves.push(chave);
  }

  const recebido = new Array(chaves.length).fill(0);
  const lucro = new Array(chaves.length).fill(0);

  for (const m of movimentos) {
    if (m.tipo !== 'ENTRADA') continue;
    const chave = m.data.slice(0, 7);
    const idx = indice.get(chave);
    if (idx !== undefined) recebido[idx] += m.valor;
  }
  for (const p of parcelas) {
    if (!p.dataPagamento) continue;
    const chave = p.dataPagamento.slice(0, 7);
    const idx = indice.get(chave);
    if (idx !== undefined) lucro[idx] += jurosRecebido(p);
  }

  return chaves.map((chave, i) => {
    const [ano, mes] = chave.split('-');
    return {
      mes: `${mes}/${ano.slice(2)}`,
      recebido: recebido[i] / 100,
      lucro: lucro[i] / 100,
    };
  });
}
