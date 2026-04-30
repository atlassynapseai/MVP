import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const { id } = await params;

  // IDOR guard: verify connection belongs to the authenticated org
  const connection = await prisma.connection.findFirst({
    where: { id, orgId },
    select: { id: true, status: true },
  });
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (connection.status === "revoked") return NextResponse.json({ error: "Already revoked" }, { status: 409 });

  await prisma.connection.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
  await prisma.auditLog.create({
    data: { orgId, userId: user.id, action: "connection.revoked", details: { connectionId: id } },
  });
  return NextResponse.json({ ok: true });
}
