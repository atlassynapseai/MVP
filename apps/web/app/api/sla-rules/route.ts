import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { z } from "zod";

const SlaRuleSchema = z.object({
  maxErrorRatePct: z.number().int().min(1).max(100),
  windowMinutes: z.number().int().min(5).max(1440).default(60),
  agentId: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const rules = await prisma.slaRule.findMany({
    where: { orgId },
    include: { agent: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = SlaRuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const { maxErrorRatePct, windowMinutes, agentId, enabled } = parsed.data;
  const resolvedAgentId = agentId ?? null;

  if (resolvedAgentId) {
    const agent = await prisma.agent.findFirst({ where: { id: resolvedAgentId, orgId }, select: { id: true } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const existing = await prisma.slaRule.findFirst({ where: { orgId, agentId: resolvedAgentId }, select: { id: true } });

  const rule = existing
    ? await prisma.slaRule.update({
      where: { id: existing.id },
      data: { maxErrorRatePct, windowMinutes, enabled },
    })
    : await prisma.slaRule.create({
      data: { orgId, agentId: resolvedAgentId, maxErrorRatePct, windowMinutes, enabled },
    });

  await prisma.auditLog.create({
    data: { orgId, userId: user.id, action: existing ? "sla_rule.updated" : "sla_rule.created", details: { maxErrorRatePct, windowMinutes, agentId: resolvedAgentId } },
  });

  return NextResponse.json(rule);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const agentId = req.nextUrl.searchParams.get("agentId") ?? null;

  const existing = await prisma.slaRule.findFirst({ where: { orgId, agentId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.slaRule.delete({ where: { id: existing.id } });
  await prisma.auditLog.create({
    data: { orgId, userId: user.id, action: "sla_rule.deleted", details: { agentId } },
  });
  return NextResponse.json({ deleted: true });
}
