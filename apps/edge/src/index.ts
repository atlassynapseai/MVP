import { Hono } from "hono";
import { cors } from "hono/cors";
import { TraceIngestSchema, piiStrip, sign } from "@atlas/shared";

type Env = {
  INGEST_WORKER_SECRET: string;
  WEB_INGEST_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: "*",
  allowMethods: ["POST", "GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Project-Token"],
}));

// In-memory rate limiter: 60 req/min per project token
// Uses a sliding window stored per isolate instance — resets on cold start.
// Good enough for abuse prevention; not a hard guarantee across all instances.
const rateLimitWindows = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitWindows.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitWindows.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

app.get("/health", (c) => c.json({ ok: true }));

app.post("/ingest", async (c) => {
  const body = await c.req.json().catch(() => null);

  const parsed = TraceIngestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const raw = parsed.data;

  // Rate limit per project token (first 16 chars as key)
  const rateLimitKey = raw.projectToken.slice(0, 16);
  if (!checkRateLimit(rateLimitKey)) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

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
    platform: raw.platform,
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
