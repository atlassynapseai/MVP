/**
 * Zapier auth test endpoint.
 * Zapier calls POST /api/webhooks/zapier/test when a user connects their account.
 * We validate the token and return 200 if valid.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@atlas/db";
import { z } from "zod";

const TestSchema = z.object({
  token: z.string().min(8).max(256),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const connection = await prisma.connection.findUnique({
    where: { projectTokenHash: tokenHash },
  }).catch(() => null);

  if (!connection || connection.status !== "active") {
    return NextResponse.json({ error: "Invalid project token" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, org_id: connection.orgId });
}
