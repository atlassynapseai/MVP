import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@atlas/db";
import { verify } from "@atlas/shared";
import { z } from "zod";

const RedactedIngestSchema = z.object({
  projectToken: z.string().min(1),
  agentId: z.string().min(1),
  externalTraceId: z.string().min(1),
  timestamp: z.string().datetime(),
  redactedPrompt: z.string(),
  redactedResponse: z.string(),
  toolCalls: z.array(z.record(z.unknown())).optional().default([]),
  tokenCount: z.number().int().nonnegative().optional(),
  costCents: z.number().nonnegative().optional(),
  rawRedactedPayload: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const workerSecret = process.env.INGEST_WORKER_SECRET;
  if (!workerSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Atlas-Signature") ?? "";

  const valid = await verify(rawBody, signature, workerSecret);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = RedactedIngestSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  // Look up connection by hashed project token
  const crypto = await import("crypto");
  const tokenHash = crypto.createHash("sha256").update(data.projectToken).digest("hex");

  const connection = await prisma.connection.findUnique({
    where: { projectTokenHash: tokenHash },
    include: { org: true },
  });

  if (!connection || connection.status !== "active") {
    return NextResponse.json({ error: "Invalid project token" }, { status: 403 });
  }

  const orgId = connection.orgId;

  // Upsert agent
  const agent = await prisma.agent.upsert({
    where: { orgId_externalId: { orgId, externalId: data.agentId } },
    update: { lastSeenAt: new Date(data.timestamp) },
    create: {
      orgId,
      externalId: data.agentId,
      displayName: data.agentId,
      lastSeenAt: new Date(data.timestamp),
    },
  });

  // Insert trace (append-only)
  await prisma.trace.create({
    data: {
      orgId,
      agentId: agent.id,
      externalTraceId: data.externalTraceId,
      timestamp: new Date(data.timestamp),
      redactedPrompt: data.redactedPrompt,
      redactedResponse: data.redactedResponse,
      toolCalls: data.toolCalls,
      tokenCount: data.tokenCount,
      costCents: data.costCents,
      rawRedactedPayload: data.rawRedactedPayload,
      status: "received",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
