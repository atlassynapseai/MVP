import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@atlas/db";
import { z } from "zod";

const AlertPrefUpdateSchema = z.object({
  mode: z.enum(["immediate", "off"]),
  severityFloor: z.enum(["warning", "critical"]),
  agentId: z.string().optional(),
});

async function resolveOrg(clerkOrgId: string) {
  return prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
}

export async function GET(req: NextRequest) {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(clerkOrgId);
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const agentId = req.nextUrl.searchParams.get("agentId") ?? null;

  const pref = await prisma.alertPref.findFirst({
    where: { orgId: org.id, agentId },
  });

  if (!pref) {
    // Return defaults
    return NextResponse.json({ mode: "immediate", severityFloor: "warning" });
  }

  return NextResponse.json({ mode: pref.mode, severityFloor: pref.severityFloor });
}

export async function PUT(req: NextRequest) {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AlertPrefUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { mode, severityFloor, agentId } = parsed.data;
  const resolvedAgentId = agentId ?? null;

  const org = await resolveOrg(clerkOrgId);
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const existing = await prisma.alertPref.findFirst({
    where: { orgId: org.id, agentId: resolvedAgentId },
    select: { id: true },
  });

  if (existing) {
    await prisma.alertPref.update({
      where: { id: existing.id },
      data: { mode, severityFloor },
    });
  } else {
    await prisma.alertPref.create({
      data: { orgId: org.id, agentId: resolvedAgentId, mode, severityFloor },
    });
  }

  return NextResponse.json({ ok: true });
}
