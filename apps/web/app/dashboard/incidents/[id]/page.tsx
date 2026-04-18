import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";
import { CATEGORY_LABELS } from "@atlas/shared";
import type { IncidentCategory } from "@atlas/shared";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FeedbackForm } from "./feedback-form";

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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) notFound();
  const { orgId, userId } = await getOrCreateOrg(authUser);

  const incident = await prisma.incident.findFirst({
    where: { id, orgId },
    include: {
      agent: { select: { displayName: true, platform: true } },
      trace: {
        select: {
          redactedPrompt: true,
          redactedResponse: true,
          evaluation: {
            select: { technicalReason: true, confidence: true, businessImpact: true },
          },
        },
      },
      feedbacks: { where: { userId }, select: { id: true }, take: 1 },
    },
  });

  if (!incident) notFound();

  const category = incident.category as IncidentCategory;
  const categoryLabel = CATEGORY_LABELS[category] ?? incident.category;
  const alreadySubmitted = Array.isArray(incident.feedbacks) && incident.feedbacks.length > 0;
  const { trace } = incident;
  const evaluation = trace?.evaluation ?? null;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link
          href="/dashboard/incidents"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Back to incidents
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-gray-100">{incident.agent.displayName}</h1>
          <SeverityBadge severity={incident.severity} />
          <span className="px-2 py-0.5 text-xs rounded border bg-gray-800 text-gray-400 border-gray-700">
            {categoryLabel}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {new Date(incident.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Business Summary — lead artifact */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          What Happened
        </h2>
        <p className="text-gray-200 text-sm leading-relaxed">{incident.summary}</p>
        {evaluation?.businessImpact && (
          <p className="text-gray-400 text-sm leading-relaxed mt-2">{evaluation.businessImpact}</p>
        )}
      </div>

      {/* Technical Details — below fold */}
      {(trace || evaluation) && (
        <details className="rounded-lg border border-gray-800 bg-gray-900 p-5 mb-4 group">
          <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none list-none flex items-center justify-between">
            Technical Details
            <span className="text-gray-600 text-base group-open:rotate-180 transition-transform">▾</span>
          </summary>

          <div className="mt-4 space-y-4">
            {evaluation && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Evaluator Reason</p>
                <p className="text-sm text-gray-300">{evaluation.technicalReason}</p>
                <p className="text-xs text-gray-600">
                  Confidence: {Math.round(evaluation.confidence * 100)}%
                </p>
              </div>
            )}

            {trace?.redactedPrompt && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Agent Input (redacted)</p>
                <pre className="text-xs text-gray-400 bg-gray-950 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words border border-gray-800 max-h-48">
                  {trace.redactedPrompt}
                </pre>
              </div>
            )}

            {trace?.redactedResponse && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Agent Output (redacted)</p>
                <pre className="text-xs text-gray-400 bg-gray-950 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words border border-gray-800 max-h-48">
                  {trace.redactedResponse}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Feedback */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Your Feedback
        </h2>
        <FeedbackForm incidentId={incident.id} alreadySubmitted={alreadySubmitted} />
      </div>
    </div>
  );
}
