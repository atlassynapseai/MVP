import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import Link from "next/link";

type OutcomeFilter = "all" | "pass" | "anomaly" | "failure";

interface EvalRow {
  id: string;
  outcome: string;
  category: string | null;
  confidence: number;
  businessImpact: string | null;
  pass: boolean;
  createdAt: Date;
  trace: {
    id: string;
    agent: { id: string; displayName: string };
    incident: { id: string } | null;
  };
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "pass")
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-emerald-900/40 text-emerald-400 border-emerald-800">
        Pass
      </span>
    );
  if (outcome === "anomaly")
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-yellow-900/40 text-yellow-400 border-yellow-800">
        Anomaly
      </span>
    );
  return (
    <span className="px-2 py-0.5 text-xs rounded border bg-red-900/40 text-red-400 border-red-800">
      Failure
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

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const params = await searchParams;
  const outcomeFilter = (params.outcome ?? "all") as OutcomeFilter;

  const where: Record<string, unknown> = { trace: { orgId } };
  if (outcomeFilter !== "all") where.outcome = outcomeFilter;

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      trace: {
        select: {
          id: true,
          agent: { select: { id: true, displayName: true } },
          incident: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filterBtn = (value: OutcomeFilter, label: string) => {
    const active = outcomeFilter === value;
    return (
      <Link
        href={`/dashboard/evaluations${value !== "all" ? `?outcome=${value}` : ""}`}
        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
          active
            ? "bg-purple-900/50 text-purple-300 border-purple-700"
            : "text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-600"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Evaluations</h1>
      <p className="text-gray-400 text-sm mb-6">
        AI-powered quality scores for every agent trace.
      </p>

      <div className="flex gap-2 mb-4">
        {filterBtn("all", "All")}
        {filterBtn("pass", "Pass")}
        {filterBtn("anomaly", "Anomaly")}
        {filterBtn("failure", "Failure")}
      </div>

      {evaluations.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No evaluations yet. Traces are evaluated automatically within ~60 seconds of ingestion.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Outcome</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Confidence</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Business Impact</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">When</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Links</th>
              </tr>
            </thead>
            <tbody>
              {(evaluations as unknown as EvalRow[]).map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">
                    <Link
                      href={`/dashboard/agents/${ev.trace.agent.id}`}
                      className="hover:text-purple-300 transition-colors"
                    >
                      {ev.trace.agent.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <OutcomeBadge outcome={ev.outcome} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {ev.category
                      ? CATEGORY_LABELS[ev.category as IncidentCategory] ?? ev.category
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        ev.confidence >= 0.85
                          ? "text-red-400"
                          : ev.confidence >= 0.6
                          ? "text-yellow-400"
                          : "text-emerald-400"
                      }
                    >
                      {Math.round(ev.confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs">
                    <span
                      className="truncate block text-xs"
                      title={ev.businessImpact ?? undefined}
                    >
                      {ev.businessImpact
                        ? ev.businessImpact.slice(0, 120) + (ev.businessImpact.length > 120 ? "…" : "")
                        : <span className="text-gray-600">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {timeAgo(new Date(ev.createdAt))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2 text-xs">
                      {ev.trace.incident && (
                        <Link
                          href={`/dashboard/incidents/${ev.trace.incident.id}`}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Incident
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
