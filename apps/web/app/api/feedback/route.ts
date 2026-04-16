import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@atlas/db";
import { z } from "zod";

const FeedbackSchema = z.object({
  incidentId: z.string().min(1),
  correct: z.boolean(),
  correctCategory: z.string().optional(),
  correctSeverity: z.enum(["warning", "critical", "none"]).optional(),
  note: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { incidentId, correct, correctCategory, correctSeverity, note } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, orgId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  // Verify incident belongs to user's org
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, orgId: user.orgId },
    select: { id: true },
  });
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  // 409 on duplicate (one feedback per user per incident)
  const existing = await prisma.feedback.findFirst({
    where: { incidentId, userId: user.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });
  }

  await prisma.feedback.create({
    data: {
      incidentId,
      userId: user.id,
      correct,
      correctCategory: correctCategory ?? null,
      correctSeverity: correctSeverity ?? null,
      note: note ?? null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
