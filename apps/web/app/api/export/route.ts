import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateOrg } from "@/lib/get-auth-org";
import { prisma } from "@atlas/db";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId } = await getOrCreateOrg(user);

  const type = req.nextUrl.searchParams.get("type") ?? "incidents";

  if (type === "incidents") {
    const incidents = await prisma.incident.findMany({
      where: { orgId },
      include: { agent: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const rows = [
      "id,agent,severity,category,summary,created_at,resolved_at",
      ...incidents.map((i) =>
        [
          i.id,
          csvEscape(i.agent.displayName),
          i.severity,
          i.category,
          csvEscape(i.summary),
          i.createdAt.toISOString(),
          i.resolvedAt?.toISOString() ?? "",
        ].join(",")
      ),
    ].join("\n");

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="incidents-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "traces") {
    const traces = await prisma.trace.findMany({
      where: { orgId },
      include: { agent: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const rows = [
      "id,agent,status,token_count,cost_micro_usd,created_at",
      ...traces.map((t) =>
        [
          t.id,
          csvEscape(t.agent.displayName),
          t.status,
          t.tokenCount ?? "",
          t.costMicroUsd ?? "",
          t.createdAt.toISOString(),
        ].join(",")
      ),
    ].join("\n");

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="traces-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
