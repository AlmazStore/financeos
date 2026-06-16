import type { Emprestimo, Parcela } from '../types/modelos';
import { diffDiasISO } from './datas';

export interface SituacaoAtraso {
  diasAtraso: number;
  valorAberto: number; // centavos ainda devidos da parcela
  multa: number; // centavos
  mora: number; // centavos
  valorAtualizado: number; // aberto + multa + mora
  emAtraso: boolean;
}

/**
 * Calcula multa fixa (%) + juros de mora ao dia (%) sobre o valor em aberto
 * de uma parcela, considerando os dias decorridos do vencimento até `hoje`.
 */
export function calcularAtraso(
  parcela: Parcela,
  emprestimo: Emprestimo,
  hojeISO: string,
): SituacaoAtraso {
  const valorAberto = Math.max(0, parcela.valorParcela - parcela.valorPago);
  const dias = diffDiasISO(parcela.dataVencimento, hojeISO);
  const emAtraso = valorAberto > 0 && dias > 0 && parcela.status !== 'PAGA';

  if (!emAtraso) {
    return {
      diasAtraso: 0,
      valorAberto,
      multa: 0,
      mora: 0,
      valorAtualizado: valorAberto,
      emAtraso: false,
    };
  }

  const multa = Math.round((valorAberto * emprestimo.multaAtraso) / 100);
  const mora = Math.round((valorAberto * emprestimo.jurosMoraDia * dias) / 100);
  return {
    diasAtraso: dias,
    valorAberto,
    multa,
    mora,
    valorAtualizado: valorAberto + multa + mora,
    emAtraso: true,
  };
}
