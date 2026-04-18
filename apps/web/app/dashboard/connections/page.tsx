import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { prisma } from "@atlas/db";
import { ConnectionsClient } from "./connections-client";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  const { orgId } = await getOrCreateOrg(user);

  const connections = await prisma.connection.findMany({
    where: { orgId },
    select: { id: true, type: true, status: true, createdAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });

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
