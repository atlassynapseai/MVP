import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const { id } = await params;

  // IDOR guard: verify the webhook belongs to this org before deleting
  const webhook = await prisma.webhook.findFirst({
    where: { id, orgId },
    select: { id: true },
  });

  if (!webhook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.webhook.delete({ where: { id: webhook.id } });
  await prisma.auditLog.create({
    data: { orgId, userId: user.id, action: "webhook.deleted", details: { webhookId: id } },
  });

  return NextResponse.json({ ok: true });
}
