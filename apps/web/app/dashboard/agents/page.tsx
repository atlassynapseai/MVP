import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl, basePath } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import Link from "next/link";

interface AgentRow {
  id: string;
  displayName: string;
  platform: string | null;
  lastSeenAt: Date | null;
  _count: { traces: number };
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

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const agents = await prisma.agent.findMany({
    where: { orgId },
    include: {
      _count: { select: { traces: true } },
      incidents: {
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { severity: true, category: true },
      },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-100">AI Workforce</h1>
        <Link
          href={`${basePath}/dashboard/agents/compare`}
          className="px-3 py-1.5 text-sm rounded border border-purple-800 bg-purple-900/30 text-purple-300 hover:bg-purple-900/60 transition-colors"
        >
          Compare
        </Link>
      </div>
      <p className="text-gray-400 text-sm mb-6">All connected AI agents and their health.</p>

      {agents.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No agents connected yet. Use the SDK or N8N template to report your first trace.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Platform</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Health</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Traces</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Open Incidents</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Top Issue</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {(agents as AgentRow[]).map((agent) => {
                const openIncidents = agent.incidents.length;
                const criticalCount = agent.incidents.filter((i) => i.severity === "critical").length;
                const health: "healthy" | "warning" | "critical" =
                  criticalCount > 0 ? "critical" : openIncidents > 0 ? "warning" : "healthy";

                const categoryFreq: Record<string, number> = {};
                for (const inc of agent.incidents) {
                  if (inc.category) categoryFreq[inc.category] = (categoryFreq[inc.category] ?? 0) + 1;
                }
                const topCategory = Object.entries(categoryFreq).sort((a, b) => b[1] - a[1])[0]?.[0] as IncidentCategory | undefined;

                return (
                  <tr key={agent.id} className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-100">{agent.displayName}</td>
                    <td className="px-4 py-3">
                      <PlatformBadge platform={agent.platform} />
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge status={health} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{agent._count.traces}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={openIncidents > 0 ? "text-yellow-400" : "text-gray-500"}>
                        {openIncidents}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {topCategory ? CATEGORY_LABELS[topCategory] : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {agent.lastSeenAt
                        ? new Date(agent.lastSeenAt).toLocaleDateString()
                        : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
