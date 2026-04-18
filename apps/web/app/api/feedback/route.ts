import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { INCIDENT_CATEGORIES } from "@atlas/shared";
import { z } from "zod";

const ALLOWED_CORRECT_CATEGORIES = new Set<string>([...INCIDENT_CATEGORIES, "none"]);

const FeedbackSchema = z.object({
  incidentId: z.string().min(1).max(64),
  correct: z.boolean(),
  correctCategory: z
    .string()
    .refine((v) => ALLOWED_CORRECT_CATEGORIES.has(v), "invalid category")
    .optional(),
  correctSeverity: z.enum(["warning", "critical", "none"]).optional(),
  note: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId, userId } = await getOrCreateOrg(user);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { incidentId, correct, correctCategory, correctSeverity, note } = parsed.data;

  // IDOR guard: incident must belong to the caller's org
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, orgId },
    select: { id: true },
  });
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const existing = await prisma.feedback.findFirst({ where: { incidentId, userId }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });

  await prisma.feedback.create({
    data: {
      incidentId,
      userId,
      correct,
      correctCategory: correctCategory ?? null,
      correctSeverity: correctSeverity ?? null,
      note: note ?? null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
