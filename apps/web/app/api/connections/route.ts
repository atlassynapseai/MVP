import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@atlas/db";

export async function GET(): Promise<NextResponse> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const connections = await prisma.connection.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connections });
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Generate a 48-char hex token (24 random bytes). Min 32 chars required by ingest schema.
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const connection = await prisma.connection.create({
    data: {
      orgId: org.id,
      type: "builder",
      projectTokenHash: tokenHash,
      status: "active",
    },
    select: { id: true, type: true, status: true, createdAt: true },
  });

  // Return the raw token ONCE — not stored, cannot be recovered.
  return NextResponse.json({ connection, token: rawToken }, { status: 201 });
}
