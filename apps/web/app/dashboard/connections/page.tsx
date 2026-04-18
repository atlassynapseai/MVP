import { auth } from "@clerk/nextjs/server";
import { prisma } from "@atlas/db";
import { ConnectionsClient } from "./connections-client";

export default async function ConnectionsPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Connections</h1>
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-yellow-300 text-sm">
          Create or select an organization to manage connections.
        </div>
      </div>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });

  const connections = org
    ? await prisma.connection.findMany({
        where: { orgId: org.id },
        select: { id: true, type: true, status: true, createdAt: true, revokedAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Connections</h1>
      <p className="text-gray-400 text-sm mb-8">
        Project tokens let your AI agents send traces to Atlas Synapse. Each token is shown once — copy it immediately.
      </p>
      <ConnectionsClient initialConnections={connections} />
    </div>
  );
}
