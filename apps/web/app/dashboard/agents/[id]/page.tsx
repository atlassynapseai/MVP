import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect, notFound } from "next/navigation";
import { appUrl, basePath } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import Link from "next/link";
import { AgentPerfCharts } from "./agent-perf-charts";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    alerted: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    translated: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    failed: "bg-red-900/40 text-red-400 border-red-800",
    received: "bg-gray-800 text-gray-400 border-gray-700",
    processing: "bg-blue-900/40 text-blue-400 border-blue-800",
    evaluated: "bg-purple-900/40 text-purple-400 border-purple-800",
  };
  const style = styles[status] ?? "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${style}`}>{status}</span>
  );
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

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const { id } = await params;

  // IDOR guard: verify org owns this agent
  const agent = await prisma.agent.findFirst({
    where: { id, orgId },
    include: {
      _count: { select: { traces: true, incidents: true } },
    },
  });

  if (!agent) notFound();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [recentTraces, recentIncidents, evalStats, last14dTraces, last14dIncidents] = await Promise.all([
    prisma.trace.findMany({
      where: { agentId: id },
      include: {
        evaluation: { select: { outcome: true, confidence: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.incident.findMany({
      where: { agentId: id, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.evaluation.aggregate({
      where: { trace: { agentId: id } },
      _count: { id: true },
    }).then(async (total) => {
      const passed = await prisma.evaluation.count({
        where: { trace: { agentId: id }, pass: true },
      });
      return { total: total._count.id, passed };
    }),
    prisma.trace.findMany({
      where: { agentId: id, createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true, evaluation: { select: { pass: true } } },
    }),
    prisma.incident.findMany({
      where: { agentId: id, createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true, category: true },
    }),
  ]);

  // Build 14-day daily stats
  const dailyMap = new Map<string, { traces: number; passed: number; evaluated: number; incidents: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(5, 10); // MM-DD
    dailyMap.set(key, { traces: 0, passed: 0, evaluated: 0, incidents: 0 });
  }
  for (const t of last14dTraces) {
    const key = new Date(t.createdAt).toISOString().slice(5, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.traces++;
      if (t.evaluation) {
        entry.evaluated++;
        if (t.evaluation.pass) entry.passed++;
      }
    }
  }
  for (const inc of last14dIncidents) {
    const key = new Date(inc.createdAt).toISOString().slice(5, 10);
    const entry = dailyMap.get(key);
    if (entry) entry.incidents++;
  }
  const dailyStats = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    traces: v.traces,
    incidents: v.incidents,
    passRate: v.evaluated > 0 ? Math.round((v.passed / v.evaluated) * 100) : null,
  }));

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const inc of last14dIncidents) {
    catMap.set(inc.category, (catMap.get(inc.category) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, count]) => ({ category: (CATEGORY_LABELS[category as IncidentCategory] ?? category).slice(0, 16), count }))
    .sort((a, b) => b.count - a.count);

  const criticalCount = recentIncidents.filter((i) => i.severity === "critical").length;
  const health: "healthy" | "warning" | "critical" =
    criticalCount > 0 ? "critical" : recentIncidents.length > 0 ? "warning" : "healthy";

  const passRate =
    evalStats.total > 0
      ? Math.round((evalStats.passed / evalStats.total) * 100)
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`${basePath}/dashboard/agents`}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Agents
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-gray-100">{agent.displayName}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {agent.platform && (
              <span className="px-2 py-0.5 text-xs rounded border bg-purple-900/40 text-purple-300 border-purple-800">
                {agent.platform}
              </span>
            )}
            <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
            {agent.lastSeenAt && (
              <span>Last seen {timeAgo(new Date(agent.lastSeenAt))}</span>
            )}
          </div>
        </div>
        <HealthBadge status={health} />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Traces</p>
          <p className="text-3xl font-bold text-gray-100">{agent._count.traces}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pass Rate</p>
          <p className={`text-3xl font-bold ${passRate === null ? "text-gray-500" : passRate >= 90 ? "text-emerald-400" : passRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>
            {passRate !== null ? `${passRate}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Incidents (7d)</p>
          <p className={`text-3xl font-bold ${recentIncidents.length > 0 ? "text-yellow-400" : "text-gray-100"}`}>
            {recentIncidents.length}
          </p>
        </div>
      </div>

      {/* Performance Charts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Performance Trends</h2>
        <AgentPerfCharts dailyStats={dailyStats} categoryBreakdown={categoryBreakdown} />
      </div>

      {/* Recent Incidents */}
      {recentIncidents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-3">Recent Incidents (7d)</h2>
          <div className="space-y-2">
            {recentIncidents.map((inc) => (
              <Link
                key={inc.id}
                href={`${basePath}/dashboard/incidents/${inc.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors"
              >
                <span className={`px-2 py-0.5 text-xs rounded border shrink-0 ${inc.severity === "critical" ? "bg-red-900/40 text-red-400 border-red-800" : "bg-yellow-900/40 text-yellow-400 border-yellow-800"}`}>
                  {inc.severity}
                </span>
                <span className="text-gray-300 text-sm flex-1 truncate">
                  {CATEGORY_LABELS[inc.category as IncidentCategory] ?? inc.category} — {inc.summary.slice(0, 100)}{inc.summary.length > 100 && "…"}
                </span>
                <span className="text-gray-500 text-xs shrink-0">{timeAgo(new Date(inc.createdAt))}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Traces */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Recent Traces</h2>
        {recentTraces.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No traces yet.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">When</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Input</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Output</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Eval</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTraces.map((trace) => (
                  <tr key={trace.id} className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {timeAgo(new Date(trace.createdAt))}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px]">
                      <span className="truncate block" title={trace.redactedPrompt}>
                        {trace.redactedPrompt.slice(0, 80)}{trace.redactedPrompt.length > 80 && "…"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px]">
                      <span className="truncate block" title={trace.redactedResponse}>
                        {trace.redactedResponse.slice(0, 80)}{trace.redactedResponse.length > 80 && "…"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {trace.evaluation ? (
                        <div className="flex items-center gap-1">
                          {trace.evaluation.outcome === "pass" ? (
                            <span className="text-emerald-400 text-xs">Pass</span>
                          ) : trace.evaluation.outcome === "anomaly" ? (
                            <span className="text-yellow-400 text-xs">Anomaly</span>
                          ) : (
                            <span className="text-red-400 text-xs">Failure</span>
                          )}
                          <span className="text-gray-600 text-xs">
                            {Math.round(trace.evaluation.confidence * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={trace.status} />
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
