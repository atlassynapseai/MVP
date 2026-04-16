import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@atlas/db";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

// Svix header names
const SVIX_ID = "svix-id";
const SVIX_TIMESTAMP = "svix-timestamp";
const SVIX_SIGNATURE = "svix-signature";

interface ClerkOrganization {
  id: string;
  name: string;
}

interface OrgCreatedEvent {
  type: "organization.created";
  data: ClerkOrganization;
}

interface OrgMembershipCreatedEvent {
  type: "organizationMembership.created";
  data: {
    organization: ClerkOrganization;
    public_user_data: {
      user_id: string;
      identifier: string; // email
    };
  };
}

type ClerkWebhookEvent = OrgCreatedEvent | OrgMembershipCreatedEvent;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const svixId = req.headers.get(SVIX_ID);
  const svixTimestamp = req.headers.get(SVIX_TIMESTAMP);
  const svixSignature = req.headers.get(SVIX_SIGNATURE);

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(rawBody, {
      [SVIX_ID]: svixId,
      [SVIX_TIMESTAMP]: svixTimestamp,
      [SVIX_SIGNATURE]: svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "organization.created") {
      await prisma.organization.upsert({
        where: { clerkOrgId: event.data.id },
        update: {},
        create: {
          clerkOrgId: event.data.id,
          name: event.data.name,
        },
      });
    } else if (event.type === "organizationMembership.created") {
      const { organization, public_user_data } = event.data;

      // Upsert org first — membership event may arrive before org.created
      const org = await prisma.organization.upsert({
        where: { clerkOrgId: organization.id },
        update: {},
        create: {
          clerkOrgId: organization.id,
          name: organization.name,
        },
      });

      await prisma.user.upsert({
        where: { clerkUserId: public_user_data.user_id },
        update: {},
        create: {
          clerkUserId: public_user_data.user_id,
          email: public_user_data.identifier,
          orgId: org.id,
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
