import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await getOrCreateOrg(user);

  const traces = await prisma.trace.findMany({
    where: { orgId },
    select: {
      id: true,
      createdAt: true,
      summary: true,
      status: true,
      agent: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ traces });
}
