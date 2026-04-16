import { z } from "zod";

export const ToolCallSchema = z.object({
  name: z.string(),
  input: z.record(z.unknown()),
  output: z.unknown().optional(),
});

export const TraceIngestSchema = z.object({
  projectToken: z.string().min(32).max(128),
  agentId: z.string().min(1).max(256),
  externalTraceId: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  prompt: z.string().max(50_000),
  response: z.string().max(50_000),
  toolCalls: z.array(ToolCallSchema).optional().default([]),
  tokenCount: z.number().int().nonnegative().optional(),
  costCents: z.number().nonnegative().optional(),
  /** Connector adapter identifier — not evaluated, used for display and routing. */
  platform: z.enum(["anthropic", "n8n", "generic"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TraceIngest = z.infer<typeof TraceIngestSchema>;

export const RedactedTraceSchema = TraceIngestSchema.omit({ prompt: true, response: true }).extend({
  redactedPrompt: z.string().max(50_000),
  redactedResponse: z.string().max(50_000),
  rawRedactedPayload: z.record(z.unknown()),
  toolCalls: z.array(ToolCallSchema).optional().default([]),
});

export type RedactedTrace = z.infer<typeof RedactedTraceSchema>;
