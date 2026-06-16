import type { Periodicidade } from '../types/modelos';

/**
 * Conversão da taxa quando o período informado difere da frequência da parcela.
 * Usamos proporção por dias (juros simples), comum no crédito informal.
 * Ex.: 10% ao mês -> semanal = 10 * 7/30 ≈ 2,333% por semana.
 */
export const DIAS_PERIODO: Record<Periodicidade, number> = {
  DIARIA: 1,
  SEMANAL: 7,
  QUINZENAL: 15,
  MENSAL: 30,
};

export function converterTaxa(
  taxaPercent: number,
  de: Periodicidade,
  para: Periodicidade,
): number {
  if (de === para) return taxaPercent;
  return (taxaPercent * DIAS_PERIODO[para]) / DIAS_PERIODO[de];
}
