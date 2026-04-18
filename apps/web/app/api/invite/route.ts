import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email().max(256),
});

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

  // Use Supabase admin to invite the user
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { org_id: orgId, invited_by: user.id },
    redirectTo: `${(process.env.NEXT_PUBLIC_APP_URL ?? "").trim()}/auth/callback`,
  });

  if (error) {
    // Supabase returns 422 if user already exists — treat as success
    if (error.message?.includes("already registered") || error.status === 422) {
      return NextResponse.json({ ok: true, note: "user already exists" });
    }
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
