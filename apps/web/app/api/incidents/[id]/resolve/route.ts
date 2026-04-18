import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, orgId },
    select: { id: true, resolvedAt: true },
  });
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.incident.update({
    where: { id },
    data: {
      resolvedAt: incident.resolvedAt ? null : new Date(),
      resolvedBy: incident.resolvedAt ? null : user.id,
    },
    select: { resolvedAt: true },
  });

  return NextResponse.json({ resolved: updated.resolvedAt !== null });
}
