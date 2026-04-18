import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";

export default async function DataTransparencyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const [traceCount, agentCount, oldestTrace] = await Promise.all([
    prisma.trace.count({ where: { orgId } }),
    prisma.agent.count({ where: { orgId } }),
    prisma.trace.findFirst({
      where: { orgId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const pendingDeletion = await prisma.trace.count({
    where: { orgId, createdAt: { lt: retentionCutoff } },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Data Transparency</h1>
        <p className="text-gray-400 text-sm">Exactly what Atlas Synapse stores — and what it strips.</p>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Stored Traces</p>
          <p className="text-2xl font-bold text-gray-100">{traceCount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Agents</p>
          <p className="text-2xl font-bold text-gray-100">{agentCount}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Due for deletion</p>
          <p className={`text-2xl font-bold ${pendingDeletion > 0 ? "text-yellow-400" : "text-gray-100"}`}>
            {pendingDeletion.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">(&gt;90 days old)</p>
        </div>
      </div>

      {oldestTrace && (
        <p className="text-xs text-gray-500">
          Oldest trace: {new Date(oldestTrace.createdAt).toLocaleDateString()} — data auto-deletes
          90 days after ingestion.
        </p>
      )}

      {/* PII stripping */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="font-semibold text-gray-200 mb-3">What we strip at the edge (before storage)</h2>
        <p className="text-xs text-gray-500 mb-4">
          PII is redacted in the Cloudflare Worker before any data reaches our database. Raw text
          is never persisted.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left pb-2 text-gray-500 font-medium">Pattern</th>
              <th className="text-left pb-2 text-gray-500 font-medium">Replaced with</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {[
              ["Email addresses", "[EMAIL]"],
              ["Phone numbers", "[PHONE]"],
              ["Social Security Numbers", "[SSN]"],
              ["Credit/debit card numbers (Luhn-validated)", "[CARD]"],
              ["Street addresses", "[ADDRESS]"],
              ["JWT tokens", "[JWT]"],
              ["API keys (sk-*, ghp_*, AKIA*)", "[API_KEY]"],
            ].map(([pattern, replacement]) => (
              <tr key={pattern} className="text-gray-400">
                <td className="py-2 pr-4">{pattern}</td>
                <td className="py-2">
                  <code className="text-purple-300 text-xs">{replacement}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* What we store */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="font-semibold text-gray-200 mb-3">What we store</h2>
        <ul className="text-sm text-gray-400 space-y-1.5 list-disc list-inside">
          <li>Redacted prompt and response content</li>
          <li>Tool call names and sanitized inputs/outputs</li>
          <li>Timestamps, token counts, cost estimates</li>
          <li>Evaluation scores and plain-English summaries</li>
          <li>Incident records (linked to traces that triggered alerts)</li>
        </ul>
      </div>

      {/* Retention */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="font-semibold text-gray-200 mb-2">Retention policy</h2>
        <ul className="text-sm text-gray-400 space-y-1.5 list-disc list-inside">
          <li>All trace data auto-deleted after <strong className="text-gray-300">90 days</strong></li>
          <li>Deletion on request — contact support</li>
          <li>No raw (un-redacted) content is stored at any point</li>
        </ul>
      </div>
    </div>
  );
}
