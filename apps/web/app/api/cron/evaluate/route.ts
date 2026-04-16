import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@atlas/db";
import type { IncidentCategory } from "@atlas/shared";
import { evaluateTrace, translate, buildDedupKey, sendImmediateAlert } from "@atlas/evaluator";

// Allow up to 60s on Vercel (hobby tier max)
export const maxDuration = 60;

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;

/** Exponential backoff: 2^n minutes, capped at 60 minutes. */
function backoffMinutes(attempts: number): number {
  return Math.min(60, Math.pow(2, attempts));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Guard: only Vercel Cron or internal callers with the secret.
  // Fail-closed: if CRON_SECRET is not configured, refuse all requests —
  // never allow unauthenticated access to the evaluation pipeline.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Atomic batch claim: set status=processing and extend nextEvaluationAt to act
  // as an expiry lock. If the worker dies, nextEvaluationAt expiry re-exposes the row.
  // Prisma doesn't support UPDATE...RETURNING, so we use a transaction:
  // 1. Find candidate trace IDs
  // 2. Update them to processing within the same tx
  const candidates = await prisma.$transaction(async (tx) => {
    const found = await tx.trace.findMany({
      where: {
        status: "received",
        OR: [
          { nextEvaluationAt: null },
          { nextEvaluationAt: { lte: now } },
        ],
      },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    if (found.length === 0) return [];

    const ids = found.map((t) => t.id);
    await tx.trace.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "processing",
        // Lock expires in 90s — re-exposes row if worker dies mid-flight
        nextEvaluationAt: addMinutes(now, 1.5),
        statusUpdatedAt: now,
      },
    });

    return ids;
  });

  if (candidates.length === 0) {
    return NextResponse.json({ processed: 0, passed: 0, incidents: 0, alerted: 0, errors: 0 });
  }

  // Fetch full trace data for claimed rows
  const traces = await prisma.trace.findMany({
    where: { id: { in: candidates } },
    include: { agent: true },
  });

  let passed = 0;
  let incidents = 0;
  let alerted = 0;
  let errors = 0;

  for (const trace of traces) {
    try {
      // Build tool calls from JSON
      const toolCalls = Array.isArray(trace.toolCalls) ? trace.toolCalls as Array<{ name: string; input: Record<string, unknown>; output?: unknown }> : [];

      // 1. Evaluate
      const evalResult = await evaluateTrace({
        redactedPrompt: trace.redactedPrompt,
        redactedResponse: trace.redactedResponse,
        toolCalls,
        tokenCount: trace.tokenCount,
        platform: trace.agent.platform,
      });

      // 2. Write Evaluation row
      await prisma.evaluation.create({
        data: {
          traceId: trace.id,
          outcome: evalResult.outcome,
          pass: evalResult.outcome === "pass",
          category: evalResult.category ?? null,
          confidence: evalResult.confidence,
          businessImpact: evalResult.businessImpact,
          technicalReason: evalResult.technicalReason,
          // Legacy field: same as technicalReason for now
          reason: evalResult.technicalReason,
          model: evalResult.model,
        },
      });

      if (evalResult.outcome === "pass") {
        await prisma.trace.update({
          where: { id: trace.id },
          data: { status: "pass", statusUpdatedAt: new Date() },
        });
        passed++;
        continue;
      }

      // 3. Non-pass: check dedup before creating incident
      const category = evalResult.category as IncidentCategory;
      const dedupKey = buildDedupKey(trace.agent.externalId, category);

      // Window: one incident per category per agent per day
      const dayStart = new Date(now);
      dayStart.setUTCHours(0, 0, 0, 0);

      const existingIncident = await prisma.incident.findFirst({
        where: {
          dedupKey,
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });

      if (existingIncident) {
        // Deduplicated — still mark trace as alerted (covered by existing incident)
        await prisma.trace.update({
          where: { id: trace.id },
          data: { status: "alerted", statusUpdatedAt: new Date() },
        });
        incidents++;
        continue;
      }

      // 4. Translate — produce three-artifact rendering
      await prisma.trace.update({
        where: { id: trace.id },
        data: { status: "evaluated", statusUpdatedAt: new Date() },
      });

      const rendering = await translate(evalResult, trace.agent.displayName);

      // 5. Create incident in transaction with trace status update
      const severity: "warning" | "critical" = evalResult.confidence >= 0.85 ? "critical" : "warning";

      const incident = await prisma.$transaction(async (tx) => {
        const inc = await tx.incident.create({
          data: {
            traceId: trace.id,
            agentId: trace.agentId,
            orgId: trace.orgId,
            severity,
            category,
            summary: rendering.incidentSummary,
            dedupKey,
          },
        });

        await tx.trace.update({
          where: { id: trace.id },
          data: { status: "translated", statusUpdatedAt: new Date() },
        });

        return inc;
      });

      incidents++;

      // 6. Resolve AlertPref and dispatch email
      const alertPref = await prisma.alertPref.findFirst({
        where: {
          orgId: trace.orgId,
          OR: [
            { agentId: trace.agentId },
            { agentId: null },
          ],
        },
        orderBy: { agentId: "desc" }, // agent-specific wins (non-null sorts last in desc)
      });

      const shouldAlert =
        !alertPref ||
        (alertPref.mode === "immediate" &&
          (alertPref.severityFloor === "warning" || severity === "critical"));

      if (shouldAlert) {
        // Get org owner email — use first User in the org
        const orgUser = await prisma.user.findFirst({
          where: { orgId: trace.orgId },
          select: { email: true },
        });

        if (orgUser?.email) {
          const alertResult = await sendImmediateAlert(
            {
              id: incident.id,
              severity,
              category,
              summary: rendering.incidentSummary,
              agentName: trace.agent.displayName,
            },
            orgUser.email,
            rendering.alertCopy,
          );

          await prisma.alert.create({
            data: {
              incidentId: incident.id,
              channel: "email",
              sentAt: new Date(),
              status: alertResult.status,
            },
          });

          if (alertResult.status === "sent") alerted++;
        }
      }

      await prisma.trace.update({
        where: { id: trace.id },
        data: { status: "alerted", statusUpdatedAt: new Date() },
      });

    } catch (err) {
      errors++;
      const attempts = trace.evaluationAttempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        await prisma.trace.update({
          where: { id: trace.id },
          data: {
            status: "failed",
            evaluationAttempts: attempts,
            statusUpdatedAt: new Date(),
          },
        });
      } else {
        await prisma.trace.update({
          where: { id: trace.id },
          data: {
            status: "received",
            evaluationAttempts: attempts,
            nextEvaluationAt: addMinutes(new Date(), backoffMinutes(attempts)),
            statusUpdatedAt: new Date(),
          },
        });
      }

      // Log only a short, non-sensitive message; never the full error object,
      // which may contain redactedPrompt/redactedResponse inside Anthropic or
      // Prisma error payloads.
      const errMsg =
        err instanceof Error ? err.name + ": " + err.message.slice(0, 200) : "unknown error";
      console.error(`[cron/evaluate] trace ${trace.id} failed (attempt ${attempts}): ${errMsg}`);
    }
  }

  return NextResponse.json({
    processed: candidates.length,
    passed,
    incidents,
    alerted,
    errors,
  });
}
