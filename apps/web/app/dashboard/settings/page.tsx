import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { AlertPrefForm } from "./alert-pref-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const pref = await prisma.alertPref.findFirst({
    where: { orgId, agentId: null },
  });

  const initialMode = (pref?.mode ?? "immediate") as "immediate" | "off";
  const initialSeverityFloor = (pref?.severityFloor ?? "warning") as "warning" | "critical";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Settings</h1>
      <p className="text-gray-400 text-sm mb-8">Alert preferences for your organization.</p>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-6">Alert Preferences</h2>
        <AlertPrefForm
          initialMode={initialMode}
          initialSeverityFloor={initialSeverityFloor}
        />
      </div>
    </div>
  );
}
