import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { redirect } from "next/navigation";
import { appUrl, basePath } from "@/lib/app-path";
import { prisma } from "@atlas/db";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);
  const { orgId } = await getOrCreateOrg(user);

  // Check what's already done
  const [connectionCount, traceCount] = await Promise.all([
    prisma.connection.count({ where: { orgId } }),
    prisma.trace.count({ where: { orgId } }),
  ]);

  // If already onboarded, redirect to dashboard
  if (traceCount > 0) redirect(`${basePath}/dashboard`);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Welcome to Atlas Synapse</h1>
        <p className="text-gray-400 text-sm">
          Connect your first AI agent in 3 steps — takes about 2 minutes.
        </p>
      </div>
      <OnboardingWizard hasConnection={connectionCount > 0} orgId={orgId} />
    </div>
  );
}
