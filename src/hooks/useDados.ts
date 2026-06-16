import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type {
  Cliente,
  Emprestimo,
  MovimentoCaixa,
  Pagamento,
  Parcela,
} from '../types/modelos';

export interface TodosDados {
  clientes: Cliente[];
  emprestimos: Emprestimo[];
  parcelas: Parcela[];
  pagamentos: Pagamento[];
  movimentos: MovimentoCaixa[];
}

/** Carrega tudo de forma reativa. Suficiente para centenas de empréstimos. */
export function useTudo(): TodosDados | undefined {
  return useLiveQuery(async () => {
    const [clientes, emprestimos, parcelas, pagamentos, movimentos] =
      await Promise.all([
        db.clientes.toArray(),
        db.emprestimos.toArray(),
        db.parcelas.toArray(),
        db.pagamentos.toArray(),
        db.movimentos.toArray(),
      ]);
    return { clientes, emprestimos, parcelas, pagamentos, movimentos };
  });
}

export function useCliente(id?: string) {
  return useLiveQuery(() => (id ? db.clientes.get(id) : undefined), [id]);
}

export function useEmprestimo(id?: string) {
  return useLiveQuery(() => (id ? db.emprestimos.get(id) : undefined), [id]);
}

export function useParcelasDoEmprestimo(emprestimoId?: string) {
  return useLiveQuery(
    () =>
      emprestimoId
        ? db.parcelas.where('emprestimoId').equals(emprestimoId).sortBy('numero')
        : [],
    [emprestimoId],
  );
}
