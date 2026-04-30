import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@atlas/db";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("Authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL ?? "alerts@atlassynapse.com";
  const fromName = process.env.BREVO_FROM_NAME ?? "Atlas Synapse";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.atlassynapse.com";

  if (!brevoApiKey) {
    return NextResponse.json({ error: "BREVO_API_KEY not set" }, { status: 500 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get all orgs with at least one user
  const orgs = await prisma.organization.findMany({
    include: { users: { select: { email: true }, take: 1 } },
  });

  let sent = 0;
  let errors = 0;

  for (const org of orgs) {
    const toEmail = org.users[0]?.email;
    if (!toEmail) continue;

    const [traceCount, incidentCount, agentCount, topIncidents] = await Promise.all([
      prisma.trace.count({ where: { orgId: org.id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.incident.count({ where: { orgId: org.id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.agent.count({ where: { orgId: org.id } }),
      prisma.incident.findMany({
        where: { orgId: org.id, createdAt: { gte: sevenDaysAgo } },
        include: { agent: { select: { displayName: true } } },
        orderBy: { severity: "desc" },
        take: 5,
      }),
    ]);

    const evalTotal = await prisma.evaluation.count({ where: { trace: { orgId: org.id, createdAt: { gte: sevenDaysAgo } } } });
    const evalPassed = await prisma.evaluation.count({ where: { trace: { orgId: org.id, createdAt: { gte: sevenDaysAgo } }, pass: true } });
    const passRate = evalTotal > 0 ? Math.round((evalPassed / evalTotal) * 100) : null;

    function escHtml(s: string) {
      return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    // Validates http/https-only URL before use in href attributes
    function safeHref(url: string): string {
      if (!/^https?:\/\//.test(url)) return "#";
      return escHtml(url);
    }

    const incidentRows = topIncidents.map((inc) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escHtml(inc.agent.displayName)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escHtml(inc.severity)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${escHtml(inc.summary.slice(0, 100))}${inc.summary.length > 100 ? "…" : ""}</td>
      </tr>`).join("");

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="margin:0 0 4px;">Weekly AI Agent Report</h2>
  <p style="color:#666;margin:0 0 24px;font-size:14px;">${org.name} — last 7 days</p>

  <div style="display:flex;gap:16px;margin-bottom:24px;">
    <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;">${traceCount}</div>
      <div style="font-size:12px;color:#6b7280;">Traces</div>
    </div>
    <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:${incidentCount > 0 ? "#d97706" : "#1a1a1a"};">${incidentCount}</div>
      <div style="font-size:12px;color:#6b7280;">Incidents</div>
    </div>
    <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:${passRate === null ? "#6b7280" : passRate >= 90 ? "#059669" : passRate >= 70 ? "#d97706" : "#dc2626"};">${passRate !== null ? `${passRate}%` : "—"}</div>
      <div style="font-size:12px;color:#6b7280;">Pass Rate</div>
    </div>
    <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;">${agentCount}</div>
      <div style="font-size:12px;color:#6b7280;">Agents</div>
    </div>
  </div>

  ${topIncidents.length > 0 ? `
  <h3 style="margin:0 0 12px;font-size:15px;">Top Incidents This Week</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="text-align:left;padding:8px 12px;">Agent</th>
        <th style="text-align:left;padding:8px 12px;">Severity</th>
        <th style="text-align:left;padding:8px 12px;">Summary</th>
      </tr>
    </thead>
    <tbody>${incidentRows}</tbody>
  </table>` : `<p style="color:#6b7280;font-size:14px;">No incidents this week. ✓</p>`}

  <a href="${safeHref(appUrl)}/dashboard"
     style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
    View Full Dashboard
  </a>

  <p style="color:#9ca3af;font-size:11px;margin-top:32px;">
    AtlasSynapse — HR for Your AI<br>
    <a href="${safeHref(appUrl)}/dashboard/settings" style="color:#9ca3af;">Manage notification settings</a>
  </p>
</body>
</html>`;

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
        body: JSON.stringify({
          sender: { email: fromEmail, name: fromName },
          to: [{ email: toEmail }],
          subject: `[AtlasSynapse] Weekly report — ${traceCount} traces, ${incidentCount} incidents`,
          htmlContent: html,
        }),
      });
      if (res.ok) sent++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ sent, errors, orgs: orgs.length });
}
