import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@atlas/db";
import { verify, ToolCallSchema } from "@atlas/shared";
import { z } from "zod";

const MAX_BODY_BYTES = 262_144;

const RedactedIngestSchema = z.object({
  projectToken: z.string().min(32).max(128),
  agentId: z.string().min(1).max(256),
  externalTraceId: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  redactedPrompt: z.string().max(50_000),
  redactedResponse: z.string().max(50_000),
  toolCalls: z.array(ToolCallSchema).optional().default([]),
  tokenCount: z.number().int().nonnegative().optional(),
  costCents: z.number().nonnegative().optional(),
  platform: z.enum(["anthropic", "n8n", "generic"]).optional(),
  rawRedactedPayload: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const workerSecret = process.env.INGEST_WORKER_SECRET;
  if (!workerSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const contentLength = req.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = req.headers.get("X-Atlas-Signature") ?? "";

  const valid = await verify(rawBody, signature, workerSecret);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = RedactedIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    // Look up connection by hashed project token
    const tokenHash = createHash("sha256").update(data.projectToken).digest("hex");

    const connection = await prisma.connection.findUnique({
      where: { projectTokenHash: tokenHash },
      include: { org: true },
    });

    if (!connection || connection.status !== "active") {
      return NextResponse.json({ error: "Invalid project token" }, { status: 403 });
    }

    const orgId = connection.orgId;

    // Upsert agent — use server time for lastSeenAt; write platform on create only
    const agent = await prisma.agent.upsert({
      where: { orgId_externalId: { orgId, externalId: data.agentId } },
      update: { lastSeenAt: new Date() },
      create: {
        orgId,
        externalId: data.agentId,
        displayName: data.agentId,
        lastSeenAt: new Date(),
        ...(data.platform ? { platform: data.platform } : {}),
      },
    });

    // Upsert trace — idempotent on (agentId, externalTraceId)
    // The @@unique([agentId, externalTraceId]) constraint is added in schema.prisma;
    // after migration, replace with prisma.trace.upsert on that compound key.
    const existing = await prisma.trace.findFirst({
      where: { agentId: agent.id, externalTraceId: data.externalTraceId },
      select: { id: true },
    });

    if (!existing) {
      await prisma.trace.create({
        data: {
          org: { connect: { id: orgId } },
          agent: { connect: { id: agent.id } },
          externalTraceId: data.externalTraceId,
          timestamp: new Date(data.timestamp),
          redactedPrompt: data.redactedPrompt,
          redactedResponse: data.redactedResponse,
          toolCalls: data.toolCalls as unknown as object,
          rawRedactedPayload: data.rawRedactedPayload as unknown as object,
          status: "received",
          ...(data.tokenCount !== undefined ? { tokenCount: data.tokenCount } : {}),
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
