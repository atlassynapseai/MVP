import { createHash } from "node:crypto";
import type { IncidentCategory } from "@atlas/shared";

/**
 * Build a stable dedup key anchored to category (not freeform reason).
 * Format: `${agentId}:${category}:${YYYY-MM-DD}`
 *
 * Same category of failure for the same agent on the same calendar day
 * produces the same key → one incident per day per category per agent.
 */
export function buildDedupKey(
  agentId: string,
  category: IncidentCategory,
  date: Date = new Date(),
): string {
  const datePart = date.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  // Hash agentId to avoid colon conflicts and keep key length bounded
  const agentHash = createHash("sha256").update(agentId).digest("hex").slice(0, 16);
  return `${agentHash}:${category}:${datePart}`;
}
