export type Frequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  DAILY: "Diária",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

export function advanceDate(date: Date, frequency: Frequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "DAILY": d.setDate(d.getDate() + 1); break;
    case "WEEKLY": d.setDate(d.getDate() + 7); break;
    case "BIWEEKLY": d.setDate(d.getDate() + 14); break;
    case "MONTHLY": d.setMonth(d.getMonth() + 1); break;
    case "QUARTERLY": d.setMonth(d.getMonth() + 3); break;
    case "YEARLY": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}
