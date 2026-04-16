import { auth } from "@clerk/nextjs/server";
import { prisma } from "@atlas/db";
import { AlertPrefForm } from "./alert-pref-form";

export default async function SettingsPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Settings</h1>
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-yellow-300 text-sm">
          Create or select an organization to configure settings.
        </div>
      </div>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });

  // Load org-level alert pref (agentId = null)
  const pref = org
    ? await prisma.alertPref.findFirst({
        where: { orgId: org.id, agentId: null },
      })
    : null;

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
