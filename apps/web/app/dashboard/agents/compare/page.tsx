import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl, basePath } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import Link from "next/link";

interface AgentWithStats {
  id: string;
  displayName: string;
  platform: string | null;
  lastSeenAt: Date | null;
  _count: { traces: number };
  incidents: Array<{ severity: string }>;
  passCount: number;
  totalEvals: number;
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
  if (!platform) return <span className="text-gray-600">—</span>;
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

function healthRank(agent: AgentWithStats): number {
  const criticalCount = agent.incidents.filter((i) => i.severity === "critical").length;
  if (criticalCount > 0) return 0;
  if (agent.incidents.length > 0) return 1;
  return 2;
}

export default async function AgentsComparePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const agentsRaw = await prisma.agent.findMany({
    where: { orgId },
    include: {
      _count: { select: { traces: true } },
      incidents: {
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { severity: true },
      },
    },
  });

  // Fetch pass rates per agent in parallel
  const agentsWithStats: AgentWithStats[] = await Promise.all(
    agentsRaw.map(async (agent) => {
      const [passCount, totalEvals] = await Promise.all([
        prisma.evaluation.count({ where: { trace: { agentId: agent.id }, pass: true } }),
        prisma.evaluation.count({ where: { trace: { agentId: agent.id } } }),
      ]);
      return { ...agent, passCount, totalEvals };
    })
  );

  // Sort: critical first, then warning, then healthy; ties broken by trace count desc
  const sorted = [...agentsWithStats].sort((a, b) => {
    const hr = healthRank(a) - healthRank(b);
    if (hr !== 0) return hr;
    return b._count.traces - a._count.traces;
  });

  // Best agent = highest pass rate among those with at least one evaluation
  const withEvals = sorted.filter((a) => a.totalEvals > 0);
  const bestAgentId =
    withEvals.length > 0
      ? withEvals.reduce((best, a) =>
          a.passCount / a.totalEvals > best.passCount / best.totalEvals ? a : best
        ).id
      : null;

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link
            href={`${basePath}/dashboard/agents`}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Agents
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold text-gray-100">Compare</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Side-by-side comparison of all connected AI agents.
        </p>
      </div>

      {sorted.length < 2 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          Connect at least 2 agents to compare them.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                {/* Empty corner cell */}
                <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap w-40">
                  Metric
                </th>
                {sorted.map((agent) => {
                  const isBest = agent.id === bestAgentId;
                  return (
                    <th
                      key={agent.id}
                      className={`text-center px-4 py-3 font-semibold whitespace-nowrap${
                        isBest ? " ring-1 ring-purple-700 text-purple-200" : " text-gray-100"
                      }`}
                    >
                      <Link
                        href={`${basePath}/dashboard/agents/${agent.id}`}
                        className="hover:text-purple-300 transition-colors"
                      >
                        {agent.displayName}
                      </Link>
                      {isBest && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-900/40 text-purple-300 border border-purple-800 align-middle">
                          Best
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Platform */}
              <tr className="border-b border-gray-800 bg-gray-950">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Platform</td>
                {sorted.map((agent) => (
                  <td key={agent.id} className="px-4 py-3 text-center">
                    <PlatformBadge platform={agent.platform} />
                  </td>
                ))}
              </tr>

              {/* Health */}
              <tr className="border-b border-gray-800 bg-gray-900">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Health (7d)</td>
                {sorted.map((agent) => {
                  const criticalCount = agent.incidents.filter(
                    (i) => i.severity === "critical"
                  ).length;
                  const health: "healthy" | "warning" | "critical" =
                    criticalCount > 0
                      ? "critical"
                      : agent.incidents.length > 0
                      ? "warning"
                      : "healthy";
                  return (
                    <td key={agent.id} className="px-4 py-3 text-center">
                      <HealthBadge status={health} />
                    </td>
                  );
                })}
              </tr>

              {/* Total Traces */}
              <tr className="border-b border-gray-800 bg-gray-950">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Total Traces</td>
                {sorted.map((agent) => (
                  <td key={agent.id} className="px-4 py-3 text-center text-gray-100">
                    {agent._count.traces.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Pass Rate */}
              <tr className="border-b border-gray-800 bg-gray-900">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Pass Rate (all-time)
                </td>
                {sorted.map((agent) => {
                  const rate =
                    agent.totalEvals > 0
                      ? Math.round((agent.passCount / agent.totalEvals) * 100)
                      : null;
                  return (
                    <td key={agent.id} className="px-4 py-3 text-center">
                      <span
                        className={
                          rate === null
                            ? "text-gray-600"
                            : rate >= 90
                            ? "text-emerald-400 font-semibold"
                            : rate >= 70
                            ? "text-yellow-400 font-semibold"
                            : "text-red-400 font-semibold"
                        }
                      >
                        {rate !== null ? `${rate}%` : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Incidents 7d */}
              <tr className="border-b border-gray-800 bg-gray-950">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Incidents (7d)
                </td>
                {sorted.map((agent) => (
                  <td key={agent.id} className="px-4 py-3 text-center">
                    <span
                      className={
                        agent.incidents.length > 0 ? "text-yellow-400" : "text-gray-500"
                      }
                    >
                      {agent.incidents.length}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Critical Incidents 7d */}
              <tr className="border-b border-gray-800 bg-gray-900">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Critical (7d)
                </td>
                {sorted.map((agent) => {
                  const critCount = agent.incidents.filter(
                    (i) => i.severity === "critical"
                  ).length;
                  return (
                    <td key={agent.id} className="px-4 py-3 text-center">
                      <span
                        className={
                          critCount > 0 ? "text-red-400 font-semibold" : "text-gray-500"
                        }
                      >
                        {critCount}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Last Active */}
              <tr className="bg-gray-950">
                <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Last Active
                </td>
                {sorted.map((agent) => (
                  <td key={agent.id} className="px-4 py-3 text-center text-gray-400">
                    {agent.lastSeenAt ? (
                      new Date(agent.lastSeenAt).toLocaleDateString()
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
