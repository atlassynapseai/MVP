import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { z } from "zod";
import { randomBytes } from "crypto";

const CreateWebhookSchema = z.object({
  url: z.string().url().max(512),
  events: z.array(z.enum(["incident.created", "incident.resolved"])).min(1),
});

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const webhooks = await prisma.webhook.findMany({
    where: { orgId },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      // Never return secret in list responses
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ webhooks });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateWebhookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { url, events } = parsed.data;
  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: { orgId, url, secret, events, active: true },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      secret: true, // returned once on creation so the user can copy it
    },
  });

  return NextResponse.json({ webhook }, { status: 201 });
}
