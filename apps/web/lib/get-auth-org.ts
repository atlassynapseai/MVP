import { prisma, Prisma } from "@atlas/db";

/**
 * Resolve (or auto-create) the Organization + User DB rows for a Supabase auth user.
 * On first login, creates both rows atomically.
 * Returns { orgId, userId } — always non-null if user is not null.
 */
export async function getOrCreateOrg(
  user: { id: string; email?: string | null },
): Promise<{ orgId: string; userId: string }> {
  // Fast path: org already exists for this Supabase user
  const existingOrg = await prisma.organization.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (existingOrg) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    // dbUser should always exist if org exists, but guard defensively
    if (dbUser) return { orgId: existingOrg.id, userId: dbUser.id };
  }

  // First login — provision org + user atomically
  const email = user.email ?? `user-${user.id}@unknown`;
  const name = email.split("@")[0] ?? "My Workspace";

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const org = await tx.organization.create({
      data: { ownerId: user.id, name },
      select: { id: true },
    });
    const dbUser = await tx.user.create({
      data: { supabaseUserId: user.id, email, orgId: org.id },
      select: { id: true },
    });
    return { orgId: org.id, userId: dbUser.id };
  });
}
