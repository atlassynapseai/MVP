import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl, basePath } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { AlertPrefForm } from "./alert-pref-form";
import { InviteForm } from "./invite-form";
import { WebhookForm } from "./webhook-form";
import { SlaRuleForm } from "./sla-rule-form";
import type { SerializedWebhook } from "./webhook-form";
import Link from "next/link";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const [pref, alertHistory, org, rawWebhooks, rawSlaRules] = await Promise.all([
    prisma.alertPref.findFirst({ where: { orgId, agentId: null } }),
    prisma.alert.findMany({
      where: { incident: { orgId } },
      include: {
        incident: {
          select: {
            id: true,
            severity: true,
            summary: true,
            agent: { select: { displayName: true } },
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 20,
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.webhook.findMany({
      where: { orgId },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.slaRule.findMany({
      where: { orgId },
      include: { agent: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Serialize dates for client component
  const webhooks: SerializedWebhook[] = rawWebhooks.map((wh) => ({
    ...wh,
    createdAt: wh.createdAt.toISOString(),
  }));

  const initialMode = (pref?.mode ?? "immediate") as "immediate" | "off";
  const initialSeverityFloor = (pref?.severityFloor ?? "warning") as "warning" | "critical";
  const initialSlackWebhookUrl = pref?.slackWebhookUrl ?? "";

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Settings</h1>
        <p className="text-gray-400 text-sm">Alert preferences and account info.</p>
      </div>

      {/* Org info */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Organization</h2>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Name</span>
            <span className="text-gray-200">{org?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-24">Email</span>
            <span className="text-gray-200">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Invite teammates */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Invite Teammates</h2>
        <p className="text-xs text-gray-500 mb-4">They&apos;ll receive an email with a link to join your workspace.</p>
        <InviteForm />
      </div>

      {/* Alert preferences */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-6">Alert Preferences</h2>
        <AlertPrefForm
          initialMode={initialMode}
          initialSeverityFloor={initialSeverityFloor}
          initialSlackWebhookUrl={initialSlackWebhookUrl}
          initialCustomEvalCriteria={pref?.customEvalCriteria ?? ""}
        />
      </div>

      {/* SLA Monitoring */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">SLA Monitoring</h2>
        <p className="text-xs text-gray-500 mb-4">
          Trigger a critical incident when an agent&apos;s error rate exceeds your threshold. Requires at least 5 traces in the window.
        </p>
        <SlaRuleForm initialRules={rawSlaRules.map((r) => ({ ...r, updatedAt: undefined }))} />
      </div>

      {/* Outbound webhooks */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Outbound Webhooks</h2>
        <p className="text-xs text-gray-500 mb-4">
          Receive HTTP POST notifications when incidents are created or resolved.
          Requests are signed with HMAC-SHA256 — verify using the{" "}
          <code className="text-gray-400">X-AtlasSynapse-Signature</code> header.
        </p>
        <WebhookForm initialWebhooks={webhooks} />
      </div>

      {/* Alert history */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Alert History</h2>
        {alertHistory.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500 text-sm">
            No alerts sent yet. Alerts fire automatically when incidents are detected.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Summary</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {alertHistory.map((alert) => (
                  <tr key={alert.id} className="border-b border-gray-800 bg-gray-950 last:border-0 hover:bg-gray-900 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">
                      <Link
                        href={`${basePath}/dashboard/incidents/${alert.incident.id}`}
                        className="hover:text-purple-300 transition-colors"
                      >
                        {alert.incident.agent.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs rounded border ${alert.incident.severity === "critical"
                          ? "bg-red-900/40 text-red-400 border-red-800"
                          : "bg-yellow-900/40 text-yellow-400 border-yellow-800"
                        }`}>
                        {alert.incident.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs">
                      <span className="truncate block text-xs">
                        {alert.incident.summary.slice(0, 100)}
                        {alert.incident.summary.length > 100 && "…"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs rounded border ${alert.status === "sent"
                          ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
                          : "bg-red-900/40 text-red-400 border-red-800"
                        }`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {timeAgo(new Date(alert.sentAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
