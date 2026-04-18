import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { evaluateTrace } from "@atlas/evaluator";
import { z } from "zod";

const BodySchema = z.object({
  traceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await getOrCreateOrg(user);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // IDOR guard: verify org owns this trace
  const trace = await prisma.trace.findFirst({
    where: { id: parsed.data.traceId, orgId },
    include: { agent: true },
  });

  if (!trace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  // Run evaluation
  const toolCalls = Array.isArray(trace.toolCalls)
    ? (trace.toolCalls as Array<{ name: string; input: Record<string, unknown>; output?: unknown }>)
    : [];

  const evalResult = await evaluateTrace({
    redactedPrompt: trace.redactedPrompt,
    redactedResponse: trace.redactedResponse,
    toolCalls,
    tokenCount: trace.tokenCount ?? null,
    platform: trace.agent.platform ?? null,
  });

  // Upsert evaluation — create or update if already exists
  const existing = await prisma.evaluation.findUnique({
    where: { traceId: trace.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.evaluation.update({
      where: { traceId: trace.id },
      data: {
        outcome: evalResult.outcome,
        pass: evalResult.outcome === "pass",
        category: evalResult.category ?? null,
        confidence: evalResult.confidence,
        businessImpact: evalResult.businessImpact,
        technicalReason: evalResult.technicalReason,
        reason: evalResult.technicalReason,
        model: evalResult.model,
      },
    });
  } else {
    await prisma.evaluation.create({
      data: {
        traceId: trace.id,
        outcome: evalResult.outcome,
        pass: evalResult.outcome === "pass",
        category: evalResult.category ?? null,
        confidence: evalResult.confidence,
        businessImpact: evalResult.businessImpact,
        technicalReason: evalResult.technicalReason,
        reason: evalResult.technicalReason,
        model: evalResult.model,
      },
    });
  }

  return NextResponse.json({ ok: true, evaluation: evalResult });
}
