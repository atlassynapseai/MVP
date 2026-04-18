import { auth } from "@clerk/nextjs/server";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";

interface AgentRow {
  id: string;
  displayName: string;
  platform: string | null;
  lastSeenAt: Date | null;
  _count: { traces: number; incidents: number };
  incidents: Array<{ severity: string; category: string | null }>;
}

function HealthBadge({ status }: { status: "healthy" | "warning" | "critical" }) {
  const styles = {
    healthy: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    warning: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    critical: "bg-red-900/40 text-red-400 border-red-800",
  };
  const labels = { healthy: "Healthy", warning: "Needs Attention", critical: "Critical" };
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null;
  const styles: Record<string, string> = {
    anthropic: "bg-purple-900/40 text-purple-300 border-purple-800",
    n8n: "bg-blue-900/40 text-blue-300 border-blue-800",
    generic: "bg-gray-800 text-gray-400 border-gray-700",
  };
  const style = styles[platform] ?? styles["generic"]!;
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${style}`}>
      {platform}
    </span>
  );
}

export default async function DashboardPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Your AI Workforce</h1>
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-yellow-300 text-sm">
          Create or select an organization to start monitoring agents.
        </div>
      </div>
    );
  }

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId }, select: { id: true } });
  if (!org) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Your AI Workforce</h1>
        <p className="text-gray-400 text-sm">Setting up your organization…</p>
      </div>
    );
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const agents = await prisma.agent.findMany({
    where: { orgId: org.id },
    include: {
      _count: { select: { traces: true, incidents: true } },
      incidents: {
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { severity: true, category: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  if (agents.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Your AI Workforce</h1>
        <p className="text-gray-400 text-sm mb-6">All your AI agents at a glance.</p>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No agents connected yet. Use the SDK or N8N template to report your first trace.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Your AI Workforce</h1>
      <p className="text-gray-400 text-sm mb-6">Agent health at a glance — last 7 days.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(agents as AgentRow[]).map((agent) => {
          const openIncidents = agent.incidents.length;
          const criticalCount = agent.incidents.filter((i) => i.severity === "critical").length;
          const health: "healthy" | "warning" | "critical" =
            criticalCount > 0 ? "critical" : openIncidents > 0 ? "warning" : "healthy";

          // Most common category this week
          const categoryFreq: Record<string, number> = {};
          for (const inc of agent.incidents) {
            if (inc.category) categoryFreq[inc.category] = (categoryFreq[inc.category] ?? 0) + 1;
          }
          const topCategory = Object.entries(categoryFreq).sort((a, b) => b[1] - a[1])[0]?.[0] as IncidentCategory | undefined;

          return (
            <div key={agent.id} className="rounded-lg border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-100 text-sm">{agent.displayName}</p>
                  <PlatformBadge platform={agent.platform} />
                </div>
                <HealthBadge status={health} />
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Open incidents</span>
                  <span className={openIncidents > 0 ? "text-yellow-400" : "text-gray-500"}>{openIncidents}</span>
                </div>
                {topCategory && (
                  <div className="flex justify-between">
                    <span>Top issue type</span>
                    <span className="text-gray-300">{CATEGORY_LABELS[topCategory]}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Last active</span>
                  <span>{agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
