import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { orgId } = await auth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Agent Overview</h1>
      <p className="text-gray-400 text-sm mb-6">All your AI agents, plain English.</p>
      {!orgId && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-yellow-300 text-sm">
          Create or select an organization to start monitoring agents.
        </div>
      )}
      {orgId && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          No agents connected yet. Connect your first agent to see data here.
        </div>
      )}
    </div>
  );
}
