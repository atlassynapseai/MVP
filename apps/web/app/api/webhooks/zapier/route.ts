/**
 * Zapier / Make.com webhook receiver.
 *
 * Accepts a simple JSON payload from a Zapier "Webhooks by Zapier" action
 * (or Make.com HTTP module), applies PII redaction inline, and stores a
 * trace for evaluation — no SDK or developer required.
 *
 * Payload format (all fields except `token` are optional):
 * {
 *   "token":      "proj_...",           // project token (required)
 *   "agent_name": "My Zapier Agent",   // display name (default: "zapier-agent")
 *   "trace_id":   "my-run-001",        // idempotency key (default: auto-generated)
 *   "input":      "User asked: ...",   // prompt / input sent to the AI
 *   "output":     "Agent replied: ...",// response / output from the AI
 *   "timestamp":  "2024-01-01T00:00:00Z", // ISO 8601 (default: now)
 *   "platform":   "zapier",            // optional label
 *   "token_count": 312                 // optional
 * }
 *
 * Returns 201 { ok: true, trace_id: "..." } on success.
 * Authentication: project token in payload body — no HMAC required.
 * This route is public (no Supabase session needed) — added to middleware allowlist.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@atlas/db";
import { piiStrip } from "@atlas/shared";
import { z } from "zod";

const MAX_BODY_BYTES = 131_072; // 128 KB

const ZapierPayloadSchema = z.object({
  token: z.string().min(8).max(256),
  agent_name: z.string().min(1).max(256).optional().default("zapier-agent"),
  trace_id: z.string().min(1).max(256).optional(),
  input: z.string().max(50_000).optional().default(""),
  output: z.string().max(50_000).optional().default(""),
  timestamp: z.string().datetime().optional(),
  platform: z.string().max(64).optional().default("zapier"),
  token_count: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read body" }, { status: 400 });
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ZapierPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  // Look up connection by hashed project token
  const tokenHash = createHash("sha256").update(data.token).digest("hex");
  const connection = await prisma.connection.findUnique({
    where: { projectTokenHash: tokenHash },
  }).catch(() => null);

  if (!connection || connection.status !== "active") {
    return NextResponse.json({ error: "Invalid project token" }, { status: 403 });
  }

  const orgId = connection.orgId;
  const traceId = data.trace_id ?? randomUUID();
  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

  // PII redaction — same protection as the edge worker
  const redactedPrompt = piiStrip(data.input);
  const redactedResponse = piiStrip(data.output);

  try {
    // Upsert agent
    const agent = await prisma.agent.upsert({
      where: { orgId_externalId: { orgId, externalId: data.agent_name } },
      update: { lastSeenAt: new Date() },
      create: {
        orgId,
        externalId: data.agent_name,
        displayName: data.agent_name,
        platform: data.platform ?? "zapier",
        lastSeenAt: new Date(),
      },
    });

    // Idempotent trace creation
    const existing = await prisma.trace.findFirst({
      where: { agentId: agent.id, externalTraceId: traceId },
      select: { id: true },
    });

    if (!existing) {
      await prisma.trace.create({
        data: {
          org: { connect: { id: orgId } },
          agent: { connect: { id: agent.id } },
          externalTraceId: traceId,
          timestamp,
          redactedPrompt,
          redactedResponse,
          toolCalls: [],
          rawRedactedPayload: {
            source: "zapier",
            agent_name: data.agent_name,
            platform: data.platform,
          },
          status: "received",
          ...(data.token_count !== undefined ? { tokenCount: data.token_count } : {}),
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, trace_id: traceId }, { status: 201 });
}
