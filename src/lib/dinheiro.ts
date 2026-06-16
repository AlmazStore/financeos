/**
 * Utilitários de dinheiro.
 *
 * REGRA DE OURO (seção 8.1): todo valor monetário é armazenado e calculado
 * como CENTAVOS INTEIROS (number inteiro). A formatação para Real só acontece
 * na borda da exibição. Nunca usar float para somar/subtrair dinheiro.
 */

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatadorNumero = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata centavos inteiros como "R$ 1.234,56". */
export function formatBRL(centavos: number): string {
  return formatadorBRL.format(centavos / 100);
}

/** Formata centavos inteiros como "1.234,56" (sem o símbolo R$). */
export function formatNumero(centavos: number): string {
  return formatadorNumero.format(centavos / 100);
}

/** Converte reais (number, ex.: 1000.5) para centavos inteiros (100050). */
export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/** Converte centavos inteiros para reais (number). Use só para exibição/cálculo de taxa. */
export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

/**
 * Converte texto digitado pelo usuário em centavos inteiros.
 * Aceita "1.234,56", "1234,56", "1234.56", "1234" etc.
 * Retorna 0 para entrada vazia/ inválida.
 */
export function parseValorParaCentavos(texto: string): number {
  if (!texto) return 0;
  const limpo = texto
    .replace(/\s|R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const valor = Number(limpo);
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 100);
}

/** Formata uma taxa decimal (0.1) como percentual "10%" ou "10,00%". */
export function formatPercent(decimal: number, casas = 2): string {
  return `${(decimal * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}
