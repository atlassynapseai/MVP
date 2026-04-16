import Anthropic from "@anthropic-ai/sdk";
import type { EvaluationResult, IncidentRendering } from "@atlas/shared";
import { CATEGORY_LABELS } from "@atlas/shared";
import { TRANSLATE_SYSTEM_PROMPT, CATEGORY_DESCRIPTIONS } from "./prompts.js";

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 600;
const TEMPERATURE = 0.3; // slight variation for more natural writing

interface RawRendering {
  traceSummary: unknown;
  incidentSummary: unknown;
  alertCopy: unknown;
}

function parseRendering(raw: unknown): IncidentRendering {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Render response is not an object");
  }
  const r = raw as RawRendering;
  if (typeof r.traceSummary !== "string" || r.traceSummary.trim() === "") {
    throw new Error("traceSummary must be a non-empty string");
  }
  if (typeof r.incidentSummary !== "string" || r.incidentSummary.trim() === "") {
    throw new Error("incidentSummary must be a non-empty string");
  }
  if (typeof r.alertCopy !== "string" || r.alertCopy.trim() === "") {
    throw new Error("alertCopy must be a non-empty string");
  }
  // Enforce alertCopy word limit (~150 words)
  const words = r.alertCopy.split(/\s+/).length;
  const alertCopy = words > 160 ? r.alertCopy.split(/\s+/).slice(0, 150).join(" ") + "…" : r.alertCopy;

  return {
    traceSummary: r.traceSummary as string,
    incidentSummary: r.incidentSummary as string,
    alertCopy,
  };
}

/**
 * Translate an EvaluationResult into three human-readable artifacts
 * for the dashboard, incident record, and email alert.
 */
export async function translate(
  result: EvaluationResult,
  agentName: string,
  client?: Anthropic,
): Promise<IncidentRendering> {
  const anthropic = client ?? new Anthropic();

  const categoryLabel = result.category ? CATEGORY_LABELS[result.category] : "Unknown";
  const categoryDescription = result.category ? CATEGORY_DESCRIPTIONS[result.category] : "";

  const userContent = `## Failure Information

**Agent name:** ${agentName}
**Failure type:** ${categoryLabel} — ${categoryDescription}
**Severity:** ${result.confidence >= 0.85 ? "Critical" : "Warning"}
**Business impact:** ${result.businessImpact}
**Technical reason:** ${result.technicalReason}

Generate the three text artifacts (traceSummary, incidentSummary, alertCopy) as JSON.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: TRANSLATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in translate response");
  }

  let parsed: unknown;
  try {
    const cleaned = textBlock.text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse translate JSON: ${textBlock.text.slice(0, 200)}`);
  }

  return parseRendering(parsed);
}
