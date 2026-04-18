import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@atlas/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // IDOR guard: verify this connection belongs to the authenticated org.
  const connection = await prisma.connection.findFirst({
    where: { id, orgId: org.id },
    select: { id: true, status: true },
  });

  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (connection.status === "revoked") {
    return NextResponse.json({ error: "Already revoked" }, { status: 409 });
  }

  await prisma.connection.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
