import type { Visit } from "./types";

/**
 * Return a patient's unique visit types, prioritizing the most recently used
 * labels while preserving their stored display casing.
 */
export function getUniqueVisitTypes(visits: Visit[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const newestFirst = [...visits].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  for (const visit of newestFirst) {
    for (const type of visit.type) {
      const trimmed = type.trim();
      const key = trimmed.toLowerCase();
      if (trimmed && !seen.has(key)) {
        seen.add(key);
        result.push(trimmed);
      }
    }
  }

  return result;
}
