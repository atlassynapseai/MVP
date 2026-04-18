import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { TracesTable } from "./traces-table";

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
    take: 200,
  });

  // Serialize dates for client component
  const serialized = traces.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    toolCalls: undefined,
    rawRedactedPayload: undefined,
    statusUpdatedAt: t.statusUpdatedAt.toISOString(),
    nextEvaluationAt: t.nextEvaluationAt?.toISOString() ?? null,
    timestamp: t.timestamp.toISOString(),
  }));

  const agentNames = [...new Set(traces.map((t) => t.agent.displayName))].sort();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Traces</h1>
      <p className="text-gray-400 text-sm mb-6">All agent runs — filter and search, click a row to see full details.</p>
      {traces.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No traces yet. Send your first trace using a Connection token.
        </div>
      ) : (
        <TracesTable traces={serialized as Parameters<typeof TracesTable>[0]["traces"]} agentNames={agentNames} />
      )}
    </div>
  );
}
