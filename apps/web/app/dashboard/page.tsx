import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { ActivityFeed } from "./activity-feed";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [agentCount, tracesToday, evalStats, activeIncidents] = await Promise.all([
    prisma.agent.count({ where: { orgId } }),
    prisma.trace.count({ where: { orgId, createdAt: { gte: today } } }),
    prisma.evaluation.aggregate({
      where: { trace: { orgId } },
      _count: { id: true },
    }).then(async (total) => {
      const passed = await prisma.evaluation.count({
        where: { trace: { orgId }, pass: true },
      });
      return { total: total._count.id, passed };
    }),
    prisma.incident.count({ where: { orgId, createdAt: { gte: sevenDaysAgo } } }),
  ]);

  const passRate =
    evalStats.total > 0 ? Math.round((evalStats.passed / evalStats.total) * 100) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Your AI Workforce</h1>
        <p className="text-gray-400 text-sm">Monitor your AI agents — last 7 days.</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Agents" value={agentCount.toString()} />
        <StatCard label="Traces Today" value={tracesToday.toString()} />
        <StatCard
          label="Pass Rate"
          value={passRate !== null ? `${passRate}%` : "—"}
          valueClass={
            passRate === null
              ? "text-gray-500"
              : passRate >= 90
              ? "text-emerald-400"
              : passRate >= 70
              ? "text-yellow-400"
              : "text-red-400"
          }
        />
        <StatCard
          label="Active Incidents (7d)"
          value={activeIncidents.toString()}
          valueClass={activeIncidents > 0 ? "text-yellow-400" : "text-gray-100"}
        />
      </div>

      {/* Empty state */}
      {agentCount === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No agents connected yet. Use a Connection token and the Python SDK or N8N template to send your first trace.
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Recent Activity</h2>
        <ActivityFeed />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = "text-gray-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
