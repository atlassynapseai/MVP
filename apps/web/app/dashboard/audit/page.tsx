import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";

interface AuditLogRow {
  id: string;
  action: string;
  details: unknown;
  createdAt: Date;
  agentId: string | null;
  userId: string | null;
}

function ActionBadge({ action }: { action: string }) {
  if (action.startsWith("incident.")) {
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-purple-900/40 text-purple-300 border-purple-800 font-mono">
        {action}
      </span>
    );
  }
  if (action.startsWith("alert_pref.")) {
    return (
      <span className="px-2 py-0.5 text-xs rounded border bg-blue-900/40 text-blue-300 border-blue-800 font-mono">
        {action}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded border bg-gray-800 text-gray-400 border-gray-700 font-mono">
      {action}
    </span>
  );
}

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) return "—";
  let str: string;
  if (typeof details === "object") {
    str = Object.entries(details as Record<string, unknown>)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(", ");
  } else {
    str = String(details);
  }
  return str.length > 120 ? str.slice(0, 120) + "…" : str;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Audit Log</h1>
        <p className="text-gray-400 text-sm mt-1">
          Immutable record of all actions in your workspace.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No audit events yet. Events are recorded as your team uses the
          dashboard.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  When
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">
                  Details
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Agent
                </th>
              </tr>
            </thead>
            <tbody>
              {(logs as unknown as AuditLogRow[]).map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-sm">
                    {formatDetails(log.details)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                    {log.agentId ?? "—"}
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
