import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl, basePath } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import Link from "next/link";

interface TraceRow {
  id: string;
  createdAt: Date;
  status: string;
  redactedPrompt: string;
  redactedResponse: string;
  summary: string | null;
  agent: { id: string; displayName: string };
  evaluation: { outcome: string; confidence: number } | null;
}

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

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "pass") return <span className="text-emerald-400 text-xs">Pass</span>;
  if (outcome === "anomaly") return <span className="text-yellow-400 text-xs">Anomaly</span>;
  if (outcome === "failure") return <span className="text-red-400 text-xs">Failure</span>;
  return <span className="text-gray-500 text-xs">—</span>;
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

export default async function TracesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const traces = await prisma.trace.findMany({
    where: { orgId },
    include: {
      agent: { select: { id: true, displayName: true } },
      evaluation: { select: { outcome: true, confidence: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Traces</h1>
      <p className="text-gray-400 text-sm mb-6">All agent runs — click a row to see full details.</p>

      {traces.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No traces yet. Send your first trace using a Connection token.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">When</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Input</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Output</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Eval</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {(traces as unknown as TraceRow[]).map((trace) => (
                <tr
                  key={trace.id}
                  className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">
                    <Link
                      href={`${basePath}/dashboard/agents/${trace.agent.id}`}
                      className="hover:text-purple-300 transition-colors"
                    >
                      {trace.agent.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {timeAgo(new Date(trace.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[160px]">
                    <span className="truncate block" title={trace.redactedPrompt}>
                      {trace.redactedPrompt.slice(0, 80)}
                      {trace.redactedPrompt.length > 80 && "…"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[160px]">
                    <span className="truncate block" title={trace.redactedResponse}>
                      {trace.redactedResponse.slice(0, 80)}
                      {trace.redactedResponse.length > 80 && "…"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {trace.evaluation ? (
                      <div className="flex items-center gap-1">
                        <OutcomeBadge outcome={trace.evaluation.outcome} />
                        <span className="text-gray-600 text-xs">
                          {Math.round(trace.evaluation.confidence * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px]">
                    {trace.summary ? (
                      <span className="truncate block text-xs" title={trace.summary}>
                        {trace.summary.slice(0, 100)}
                        {trace.summary.length > 100 && "…"}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
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
