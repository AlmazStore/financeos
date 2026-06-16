import Dexie, { type Table } from 'dexie';
import type {
  Cliente,
  Configuracoes,
  Emprestimo,
  MovimentoCaixa,
  Pagamento,
  Parcela,
} from '../types/modelos';

/**
 * Banco local (IndexedDB via Dexie) — funciona 100% offline.
 * Toda a operação fica no dispositivo; backup/exportação em Configurações.
 */
export class CreditoDB extends Dexie {
  clientes!: Table<Cliente, string>;
  emprestimos!: Table<Emprestimo, string>;
  parcelas!: Table<Parcela, string>;
  pagamentos!: Table<Pagamento, string>;
  movimentos!: Table<MovimentoCaixa, string>;
  config!: Table<Configuracoes, string>;

  constructor() {
    super('credito-control');
    this.version(1).stores({
      clientes: 'id, nome, risco, criadoEm',
      emprestimos: 'id, clienteId, status, dataEmprestimo, criadoEm',
      parcelas: 'id, emprestimoId, status, dataVencimento, [emprestimoId+numero]',
      pagamentos: 'id, emprestimoId, parcelaId, data',
      movimentos: 'id, tipo, data, referenciaId',
      config: 'id',
    });
  }
}

export const db = new CreditoDB();

export const CONFIG_PADRAO: Configuracoes = {
  id: 'config',
  limiteTaxaPercent: undefined,
  descontoQuitacaoAntecipada: true,
  bloqueioInatividadeMin: 5,
  temaEscuro: false,
};

/** Garante que o registro de configuração exista e o retorna. */
export async function obterConfig(): Promise<Configuracoes> {
  const atual = await db.config.get('config');
  if (atual) return atual;
  await db.config.put(CONFIG_PADRAO);
  return CONFIG_PADRAO;
}
