import { db } from "@/lib/db";
import { fallbackHash } from "@/lib/statement-parser";

/**
 * Builds the set of fingerprints for all of a user's existing transactions.
 * Includes both the stored importHash (fast path for re-imports) and a
 * field-based hash computed from date+amount+type+title (catches transactions
 * imported before importHash existed, or from a different format).
 */
export async function getExistingFingerprints(userId: string): Promise<Set<string>> {
  const txs = await db.transaction.findMany({
    where: { userId },
    select: { date: true, amount: true, type: true, title: true, importHash: true },
  });

  const set = new Set<string>();
  for (const t of txs) {
    if (t.importHash) set.add(t.importHash);
    const iso = t.date.toISOString().slice(0, 10);
    set.add(fallbackHash({ date: iso, amount: t.amount, type: t.type, description: t.title }));
  }
  return set;
}
