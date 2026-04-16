/**
 * Canonical internal contracts for the Business Event Engine.
 * These types are NOT Zod schemas — they are pure TypeScript interfaces
 * used across @atlas/evaluator and @atlas/web cron routes.
 */

/** Stable 8-category taxonomy for incident classification. */
export type IncidentCategory =
  | "task_failure"         // agent didn't complete the requested task
  | "harmful_output"       // potentially harmful or inappropriate content
  | "tool_misuse"          // wrong tool, wrong args, unnecessary calls
  | "scope_violation"      // agent acted outside defined purpose/scope
  | "data_handling_error"  // potential data exposure risk or mishandling
  | "reasoning_error"      // clear logical or factual failure
  | "cost_anomaly"         // token/cost spike (only when tokenCount available)
  | "silent_refusal";      // agent stopped without completing or explaining

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  "task_failure",
  "harmful_output",
  "tool_misuse",
  "scope_violation",
  "data_handling_error",
  "reasoning_error",
  "cost_anomaly",
  "silent_refusal",
];

/** Human-readable labels for each category (for dashboard display). */
export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  task_failure:        "Task Failure",
  harmful_output:      "Harmful Output",
  tool_misuse:         "Tool Misuse",
  scope_violation:     "Scope Violation",
  data_handling_error: "Data Handling Error",
  reasoning_error:     "Reasoning Error",
  cost_anomaly:        "Cost Anomaly",
  silent_refusal:      "Silent Refusal",
};

/** Output contract from evaluateTrace(). */
export interface EvaluationResult {
  /** Whether the trace represents a passing, anomalous, or failing agent run. */
  outcome: "pass" | "anomaly" | "failure";
  /** Stable category; null only when outcome is "pass". */
  category: IncidentCategory | null;
  /** Confidence score 0.0–1.0. */
  confidence: number;
  /**
   * Business-language impact statement for non-technical operators.
   * E.g. "The customer support agent failed to resolve a billing query,
   * leaving the user without a solution."
   */
  businessImpact: string;
  /**
   * Technical reason for debugging.
   * E.g. "Tool call to lookup_account returned null; agent did not handle
   * the error path or retry."
   */
  technicalReason: string;
  /** Model used for evaluation (e.g. "claude-sonnet-4-5"). */
  model: string;
}

/** Three-artifact rendering output from translate(). */
export interface IncidentRendering {
  /** 1–2 sentences: what the agent was asked to do. */
  traceSummary: string;
  /**
   * 2–3 sentences: what went wrong and why it matters to the business.
   * This becomes Incident.summary in the DB.
   */
  incidentSummary: string;
  /**
   * Email-ready single paragraph, plain English, no jargon, ≤150 words.
   * Sent as the alert email body.
   */
  alertCopy: string;
}

/** Platform identifiers for connector adapters. */
export type AgentPlatform = "anthropic" | "n8n" | "generic";
