import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { z } from "zod";
import { appUrl } from "@/lib/app-path";

const InviteSchema = z.object({
  email: z.string().email().max(256),
});

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendInviteEmail(
  toEmail: string,
  inviterEmail: string,
  orgName: string,
  signupUrl: string,
): Promise<{ ok: boolean }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false };

  const fromEmail = process.env.BREVO_FROM_EMAIL ?? "team@atlassynapse.com";
  const fromName = process.env.BREVO_FROM_NAME ?? "Atlas Synapse";

  const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#7c3aed;margin-bottom:8px">You&apos;ve been invited</h2>
  <p style="color:#374151">${escapeHtml(inviterEmail)} has invited you to join <strong>${escapeHtml(orgName)}</strong> on Atlas Synapse.</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(signupUrl)}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;display:inline-block">
      Accept Invitation
    </a>
  </p>
  <p style="color:#6b7280;font-size:12px">If you did not expect this invitation, you can ignore this email.</p>
</div>`;

  const res = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: toEmail }],
      subject: `${inviterEmail} invited you to Atlas Synapse`,
      htmlContent: html,
    }),
  });

  return { ok: res.ok };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const { email } = parsed.data;

  // Prefer Supabase admin invite when SERVICE_ROLE_KEY is available
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { org_id: orgId, invited_by: user.id },
      redirectTo: `${(process.env.NEXT_PUBLIC_APP_URL ?? "").trim()}/auth/callback`,
    });
    if (error) {
      if (error.message?.includes("already registered") || error.status === 422) {
        return NextResponse.json({ ok: true, note: "user already exists" });
      }
      return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Fallback: Brevo email with signup link (works without service role key)
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  const orgName = org?.name ?? "your workspace";
  const signupUrl = `${appUrl}/login`;

  const result = await sendInviteEmail(email, user.email ?? "A teammate", orgName, signupUrl);
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
