import { z } from "zod";

export const ToolCallSchema = z.object({
  name: z.string(),
  input: z.record(z.unknown()),
  output: z.unknown().optional(),
});

export const TraceIngestSchema = z.object({
  projectToken: z.string().min(1),
  agentId: z.string().min(1),
  externalTraceId: z.string().min(1),
  timestamp: z.string().datetime(),
  prompt: z.string(),
  response: z.string(),
  toolCalls: z.array(ToolCallSchema).optional().default([]),
  tokenCount: z.number().int().nonnegative().optional(),
  costCents: z.number().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TraceIngest = z.infer<typeof TraceIngestSchema>;

export const RedactedTraceSchema = TraceIngestSchema.omit({ prompt: true, response: true }).extend({
  redactedPrompt: z.string(),
  redactedResponse: z.string(),
  rawRedactedPayload: z.record(z.unknown()),
});

export type RedactedTrace = z.infer<typeof RedactedTraceSchema>;
