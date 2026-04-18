import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import Link from "next/link";

interface IncidentRow {
  id: string;
  severity: "warning" | "critical";
  category: string;
  summary: string;
  createdAt: Date;
  agent: { displayName: string };
}

function SeverityBadge({ severity }: { severity: "warning" | "critical" }) {
  if (severity === "critical") {
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-red-900/40 text-red-400 border-red-800">
        Critical
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded border bg-yellow-900/40 text-yellow-400 border-yellow-800">
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
  if (!user) redirect("/login");
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
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Active Issues</h1>
      <p className="text-gray-400 text-sm mb-6">Agent failures in plain English — click any row to see details.</p>

      {incidents.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No incidents. When agents fail silently, they appear here.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Issue Type</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">What Happened</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {(incidents as IncidentRow[]).map((incident) => {
                const category = incident.category as IncidentCategory;
                const label = CATEGORY_LABELS[category] ?? incident.category;
                const summary = incident.summary.length > 120
                  ? incident.summary.slice(0, 120) + "…"
                  : incident.summary;

                return (
                  <tr
                    key={incident.id}
                    className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="hover:text-purple-300 transition-colors">
                        {incident.agent.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-300">{label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-sm">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="hover:text-gray-200 transition-colors">
                        {summary}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
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
