import { Hono } from "hono";
import { TraceIngestSchema, piiStrip, sign } from "@atlas/shared";

type Env = {
  INGEST_WORKER_SECRET: string;
  WEB_INGEST_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/ingest", async (c) => {
  const body = await c.req.json().catch(() => null);

  const parsed = TraceIngestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }

  const raw = parsed.data;

  // PII strip prompt + response
  const redactedPrompt = piiStrip(raw.prompt);
  const redactedResponse = piiStrip(raw.response);

  // Sanitize tool call outputs too
  const sanitizedToolCalls = raw.toolCalls.map((tc) => ({
    ...tc,
    output: tc.output != null ? piiStrip(JSON.stringify(tc.output)) : undefined,
  }));

  const redacted = {
    projectToken: raw.projectToken,
    agentId: raw.agentId,
    externalTraceId: raw.externalTraceId,
    timestamp: raw.timestamp,
    redactedPrompt,
    redactedResponse,
    toolCalls: sanitizedToolCalls,
    tokenCount: raw.tokenCount,
    costCents: raw.costCents,
    rawRedactedPayload: {
      prompt: redactedPrompt,
      response: redactedResponse,
      metadata: raw.metadata ?? {},
    },
  };

  const payload = JSON.stringify(redacted);
  const signature = await sign(payload, c.env.INGEST_WORKER_SECRET);

  const res = await fetch(c.env.WEB_INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Atlas-Signature": signature,
    },
    body: payload,
  });

  if (!res.ok) {
    return c.json({ error: "Upstream ingest failed", status: res.status }, 502);
  }

  return c.json({ ok: true });
});

export default app;
