import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect, notFound } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import Link from "next/link";

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
  return <span className={`px-2 py-0.5 text-xs rounded border ${style}`}>{status}</span>;
}

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const { id } = await params;

  // IDOR guard: verify org owns this trace
  const trace = await prisma.trace.findFirst({
    where: { id, orgId },
    include: {
      agent: { select: { id: true, displayName: true, platform: true } },
      evaluation: true,
      incident: { select: { id: true, severity: true, category: true, summary: true } },
    },
  });

  if (!trace) notFound();

  const toolCalls = Array.isArray(trace.toolCalls)
    ? (trace.toolCalls as Array<{ name: string; input: unknown; output?: unknown }>)
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/dashboard/traces`} className="hover:text-gray-300 transition-colors">
          ← Traces
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400 font-mono text-xs truncate">{trace.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/dashboard/agents/${trace.agent.id}`}
              className="text-xl font-bold text-gray-100 hover:text-purple-300 transition-colors"
            >
              {trace.agent.displayName}
            </Link>
            {trace.agent.platform && (
              <span className="px-2 py-0.5 text-xs rounded border bg-purple-900/40 text-purple-300 border-purple-800">
                {trace.agent.platform}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {new Date(trace.createdAt).toLocaleString()} · external id: <code className="text-gray-400">{trace.externalTraceId}</code>
          </p>
        </div>
        <StatusBadge status={trace.status} />
      </div>

      {/* Plain-English Summary */}
      {trace.summary && (
        <div className="rounded-lg border border-purple-800/50 bg-purple-950/20 p-5">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Plain-English Summary</p>
          <p className="text-gray-200 text-sm leading-relaxed">{trace.summary}</p>
        </div>
      )}

      {/* Evaluation */}
      {trace.evaluation && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Evaluation</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Outcome</p>
              <span className={`px-2 py-0.5 text-xs rounded border ${trace.evaluation.outcome === "pass"
                  ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
                  : trace.evaluation.outcome === "anomaly"
                    ? "bg-yellow-900/40 text-yellow-400 border-yellow-800"
                    : "bg-red-900/40 text-red-400 border-red-800"
                }`}>
                {trace.evaluation.outcome}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Confidence</p>
              <p className={`text-lg font-bold ${trace.evaluation.confidence >= 0.85 ? "text-red-400"
                  : trace.evaluation.confidence >= 0.6 ? "text-yellow-400"
                    : "text-emerald-400"
                }`}>
                {Math.round(trace.evaluation.confidence * 100)}%
              </p>
            </div>
            {trace.evaluation.category && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="text-sm text-gray-300">
                  {CATEGORY_LABELS[trace.evaluation.category as IncidentCategory] ?? trace.evaluation.category}
                </p>
              </div>
            )}
          </div>
          {trace.evaluation.businessImpact && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Business Impact</p>
              <p className="text-sm text-gray-300">{trace.evaluation.businessImpact}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Technical Reason</p>
            <p className="text-sm text-gray-400">{trace.evaluation.technicalReason}</p>
          </div>
          <p className="text-xs text-gray-600 mt-3">Model: {trace.evaluation.model}</p>
        </div>
      )}

      {/* Incident link */}
      {trace.incident && (
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/10 p-4 flex items-center justify-between">
          <div>
            <span className={`px-2 py-0.5 text-xs rounded border mr-2 ${trace.incident.severity === "critical"
                ? "bg-red-900/40 text-red-400 border-red-800"
                : "bg-yellow-900/40 text-yellow-400 border-yellow-800"
              }`}>
              {trace.incident.severity}
            </span>
            <span className="text-sm text-gray-300">
              {CATEGORY_LABELS[trace.incident.category as IncidentCategory] ?? trace.incident.category}
            </span>
            <p className="text-xs text-gray-400 mt-1">{trace.incident.summary.slice(0, 120)}{trace.incident.summary.length > 120 && "…"}</p>
          </div>
          <Link
            href={`/dashboard/incidents/${trace.incident.id}`}
            className="shrink-0 ml-4 px-3 py-1.5 text-xs rounded border border-yellow-800 text-yellow-400 hover:bg-yellow-900/30 transition-colors"
          >
            View Incident →
          </Link>
        </div>
      )}

      {/* Prompt / Response */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Trace Content (redacted)</p>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Input</p>
            <pre className="text-xs text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words border border-gray-800 max-h-64">
              {trace.redactedPrompt}
            </pre>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Output</p>
            <pre className="text-xs text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words border border-gray-800 max-h-64">
              {trace.redactedResponse}
            </pre>
          </div>
        </div>
      </div>

      {/* Tool Calls */}
      {toolCalls.length > 0 && (
        <details className="rounded-lg border border-gray-800 bg-gray-900 p-5 group">
          <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none list-none flex items-center justify-between">
            Tool Calls ({toolCalls.length})
            <span className="text-gray-600 text-base group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="mt-4 space-y-3">
            {toolCalls.map((tc, i) => (
              <div key={i} className="rounded border border-gray-800 p-3">
                <p className="text-xs font-mono text-purple-300 mb-2">{tc.name}</p>
                <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(tc.input, null, 2)}
                </pre>
                {tc.output !== undefined && (
                  <>
                    <p className="text-xs text-gray-600 mt-2 mb-1">Output:</p>
                    <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap break-words">
                      {typeof tc.output === "string" ? tc.output : JSON.stringify(tc.output, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Metadata */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Metadata</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {trace.tokenCount != null && (
            <>
              <span className="text-gray-500">Tokens</span>
              <span className="text-gray-300">{trace.tokenCount.toLocaleString()}</span>
            </>
          )}
          {trace.costMicroUsd != null && (
            <>
              <span className="text-gray-500">Cost</span>
              <span className="text-gray-300">${(trace.costMicroUsd / 1_000_000).toFixed(4)}</span>
            </>
          )}
          <span className="text-gray-500">Redaction</span>
          <span className="text-gray-300">{trace.redactionVersion}</span>
          <span className="text-gray-500">Timestamp</span>
          <span className="text-gray-300">{new Date(trace.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
