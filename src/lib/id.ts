/** Gera um ID único (uuid v4 nativo). */
export const novoId = (): string => crypto.randomUUID();

/** Data de hoje em ISO "AAAA-MM-DD" (horário local). */
export function hojeISO(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
