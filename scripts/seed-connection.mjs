/**
 * Seeds a Connection row with a known project token.
 * Run: node scripts/seed-connection.mjs
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const PROJECT_TOKEN = "atlas-test-token-32chars-xxxxxxxx";

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found. Sign in, create an org in Clerk, and ensure the webhook fired.");
    process.exit(1);
  }
  console.log(`Found org: ${org.name} (${org.id})`);

  const tokenHash = createHash("sha256").update(PROJECT_TOKEN).digest("hex");

  await prisma.connection.upsert({
    where: { projectTokenHash: tokenHash },
    update: {},
    create: {
      orgId: org.id,
      type: "builder",
      projectTokenHash: tokenHash,
      status: "active",
    },
  });

  console.log(`\n✓ Connection seeded.`);
  console.log(`  Project token: ${PROJECT_TOKEN}`);
  console.log(`\nNow send a test trace:`);
  console.log(`
curl -X POST http://localhost:63745/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectToken": "${PROJECT_TOKEN}",
    "agentId": "test-agent",
    "externalTraceId": "trace-001",
    "timestamp": "${new Date().toISOString()}",
    "prompt": "Book a flight from London to New York",
    "response": "I was unable to complete the booking due to an error.",
    "toolCalls": [
      {"name": "search_flights", "input": {"from": "LHR", "to": "JFK"}, "output": null}
    ],
    "platform": "n8n"
  }'
`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
