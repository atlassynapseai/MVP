import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@atlas/db";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const connections = await prisma.connection.findMany({
    where: { orgId },
    select: { id: true, type: true, status: true, createdAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connections });
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const connection = await prisma.connection.create({
    data: { orgId, type: "builder", projectTokenHash: tokenHash, status: "active" },
    select: { id: true, type: true, status: true, createdAt: true },
  });

  return NextResponse.json({ connection, token: rawToken }, { status: 201 });
}
