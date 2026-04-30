import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { ActivityFeed } from "./activity-feed";
import { AnimatedStatCard } from "@/components/animated-stat-card";
import Link from "next/link";

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
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-gradient-purple mb-1">Your AI Workforce</h1>
        <p className="text-gray-500 text-sm">Monitor your AI agents — last 7 days.</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedStatCard
          label="Total Agents"
          numericValue={agentCount}
          delay={0}
        />
        <AnimatedStatCard
          label="Traces Today"
          numericValue={tracesToday}
          delay={80}
        />
        {passRate !== null ? (
          <AnimatedStatCard
            label="Pass Rate"
            numericValue={passRate}
            suffix="%"
            delay={160}
            valueClass={
              passRate >= 90
                ? "text-emerald-400"
                : passRate >= 70
                  ? "text-yellow-400"
                  : "text-red-400"
            }
          />
        ) : (
          <AnimatedStatCard
            label="Pass Rate"
            displayValue="—"
            delay={160}
            valueClass="text-gray-500"
          />
        )}
        <AnimatedStatCard
          label="Active Incidents (7d)"
          numericValue={activeIncidents}
          delay={240}
          valueClass={activeIncidents > 0 ? "text-yellow-400" : "text-gray-100"}
        />
      </div>

      {/* Empty state */}
      {agentCount === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center space-y-4 animate-scale-in">
          <div className="text-4xl">🤖</div>
          <p className="text-gray-400">No agents connected yet.</p>
          <Link
            href={`/dashboard/onboarding`}
            className="inline-block px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium btn-glow transition-colors"
          >
            Get started →
          </Link>
        </div>
      )}

      {/* Recent Activity */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Recent Activity</h2>
        <ActivityFeed />
      </div>
    </div>
  );
}
