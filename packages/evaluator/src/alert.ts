import { Resend } from "resend";

interface IncidentData {
  id: string;
  severity: "warning" | "critical";
  category: string;
  summary: string;
  agentName: string;
}

interface AlertResult {
  status: "sent" | "failed";
  error?: string;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "alerts@atlassynapse.com";
const DASHBOARD_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.atlassynapse.com";

/**
 * Send an immediate email alert for a new incident.
 * Returns {status: "sent"} on success, {status: "failed", error} on failure.
 * Never throws — caller always writes Alert row regardless of outcome.
 */
export async function sendImmediateAlert(
  incident: IncidentData,
  toEmail: string,
  alertCopy: string,
  client?: Resend,
): Promise<AlertResult> {
  const resend = client ?? new Resend(process.env.RESEND_API_KEY);

  const severityLabel = incident.severity === "critical" ? "🔴 Critical" : "🟡 Warning";
  const subject = `[AtlasSynapse] ${severityLabel} — ${incident.agentName}`;
  const incidentUrl = `${DASHBOARD_BASE_URL}/dashboard/incidents/${incident.id}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="margin: 0 0 8px;">${severityLabel} Incident Detected</h2>
  <p style="color: #666; margin: 0 0 24px;">Agent: <strong>${incident.agentName}</strong></p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; line-height: 1.6;">${alertCopy}</p>
  </div>
  <a href="${incidentUrl}"
     style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px;
            border-radius: 6px; text-decoration: none; font-weight: 600;">
    View Incident
  </a>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    AtlasSynapse — HR for Your AI<br>
    <a href="${DASHBOARD_BASE_URL}/dashboard/settings" style="color: #999;">Manage alert preferences</a>
  </p>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      return { status: "failed", error: error.message };
    }
    return { status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "failed", error: message };
  }
}
