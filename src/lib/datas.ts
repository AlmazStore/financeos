/** Formata um Date como "dd/mm/aaaa". */
export function formatData(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Converte Date -> "YYYY-MM-DD" para <input type="date">. */
export function paraInputDate(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Converte "YYYY-MM-DD" de <input type="date"> -> Date local (meia-noite). */
export function deInputDate(valor: string): Date {
  const [ano, mes, dia] = valor.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Converte ISO "AAAA-MM-DD" -> Date local. */
export const isoParaData = (iso: string): Date => deInputDate(iso);

/** Formata ISO "AAAA-MM-DD" como "dd/mm/aaaa". */
export function formatISO(iso: string): string {
  return formatData(deInputDate(iso));
}

/** Date -> ISO "AAAA-MM-DD" local. */
export const dataParaISO = paraInputDate;

/** Diferença em dias inteiros entre duas datas ISO (b - a). Positivo = b depois de a. */
export function diffDiasISO(aISO: string, bISO: string): number {
  const a = deInputDate(aISO).getTime();
  const b = deInputDate(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}
