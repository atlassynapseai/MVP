import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import Link from "next/link";
import { ExportButton } from "@/components/export-button";

interface IncidentRow {
  id: string;
  severity: "warning" | "critical";
  category: string;
  summary: string;
  createdAt: Date;
  resolvedAt: Date | null;
  agent: { displayName: string };
}

function SeverityBadge({ severity }: { severity: "warning" | "critical" }) {
  if (severity === "critical") {
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-red-900/40 text-red-400 border-red-800 badge-critical">
        Critical
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded border bg-yellow-900/40 text-yellow-400 border-yellow-800 badge-warning">
      Warning
    </span>
  );
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "< 1h ago";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export default async function IncidentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const incidents = await prisma.incident.findMany({
    where: { orgId },
    include: {
      agent: { select: { displayName: true } },
    },
    orderBy: [
      { severity: "desc" },
      { createdAt: "desc" },
    ],
    take: 50,
  });

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gradient-purple">Active Issues</h1>
        <ExportButton type="incidents" />
      </div>
      <p className="text-gray-500 text-sm mb-6">Agent failures in plain English — click any row to see details.</p>

      {incidents.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500 animate-scale-in">
          No incidents. When agents fail silently, they appear here.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden animate-scale-in">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Issue Type</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">What Happened</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Severity</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">When</th>
              </tr>
            </thead>
            <tbody>
              {(incidents as unknown as IncidentRow[]).map((incident, index) => {
                const category = incident.category as IncidentCategory;
                const label = CATEGORY_LABELS[category] ?? incident.category;
                const summary = incident.summary.length > 120
                  ? incident.summary.slice(0, 120) + "…"
                  : incident.summary;

                return (
                  <tr
                    key={incident.id}
                    className={`border-b border-gray-800 table-row-accent animate-fade-in-up ${
                      incident.resolvedAt ? "bg-gray-900/40 opacity-70" : "bg-gray-950 hover:bg-gray-900/80"
                    }`}
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="hover:text-purple-300 transition-colors duration-150">
                        {incident.agent.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-300">{label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-sm">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="hover:text-gray-200 transition-colors duration-150">
                        {summary}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {incident.resolvedAt ? (
                        <span className="px-2 py-0.5 text-xs rounded border bg-emerald-900/40 text-emerald-400 border-emerald-800">Resolved</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded border bg-gray-800 text-gray-500 border-gray-700">Open</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {timeAgo(new Date(incident.createdAt))}
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
