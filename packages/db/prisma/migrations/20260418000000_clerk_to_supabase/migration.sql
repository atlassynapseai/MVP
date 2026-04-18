-- Replace Clerk auth identifiers with Supabase auth UUIDs
ALTER TABLE "Organization" RENAME COLUMN "clerkOrgId" TO "ownerId";
ALTER TABLE "User" RENAME COLUMN "clerkUserId" TO "supabaseUserId";
