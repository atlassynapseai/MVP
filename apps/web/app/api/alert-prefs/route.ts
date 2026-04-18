import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { z } from "zod";

const AlertPrefUpdateSchema = z.object({
  mode: z.enum(["immediate", "off"]),
  severityFloor: z.enum(["warning", "critical"]),
  agentId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const agentId = req.nextUrl.searchParams.get("agentId") ?? null;

  if (agentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, orgId },
      select: { id: true },
    });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const pref = await prisma.alertPref.findFirst({ where: { orgId, agentId } });
  if (!pref) return NextResponse.json({ mode: "immediate", severityFloor: "warning" });
  return NextResponse.json({ mode: pref.mode, severityFloor: pref.severityFloor });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = AlertPrefUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { mode, severityFloor, agentId } = parsed.data;
  const resolvedAgentId = agentId ?? null;

  if (resolvedAgentId) {
    const agent = await prisma.agent.findFirst({ where: { id: resolvedAgentId, orgId }, select: { id: true } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const existing = await prisma.alertPref.findFirst({ where: { orgId, agentId: resolvedAgentId }, select: { id: true } });
  if (existing) {
    await prisma.alertPref.update({ where: { id: existing.id }, data: { mode, severityFloor } });
  } else {
    await prisma.alertPref.create({ data: { orgId, agentId: resolvedAgentId, mode, severityFloor } });
  }

  return NextResponse.json({ ok: true });
}
