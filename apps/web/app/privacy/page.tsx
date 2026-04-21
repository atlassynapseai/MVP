import Link from "next/link";

export default function PrivacyPage() {
  const updated = "2026-04-18";
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href={`/dashboard`} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-100 mt-4 mb-1">Privacy Policy</h1>
          <p className="text-xs text-gray-500">Last updated: {updated}</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">What we collect</h2>
          <p>Atlas Synapse collects AI agent traces submitted via the ingest API: prompts, responses, tool call names and inputs/outputs, timestamps, and token counts. Before storage, all content passes through our PII redaction layer which strips emails, phone numbers, SSNs, credit card numbers, street addresses, JWT tokens, and API keys.</p>
          <p>We also collect your account email address (via Supabase Auth) and billing information if applicable.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">How we use it</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Evaluate agent traces for anomalies, policy violations, and failures</li>
            <li>Generate plain-English incident summaries</li>
            <li>Send email and Slack alerts when incidents are detected</li>
            <li>Display activity in your dashboard</li>
          </ul>
          <p>We do not sell data, share it with third parties (except sub-processors below), or use it to train AI models.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Sub-processors</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Supabase</strong> — authentication and database hosting</li>
            <li><strong className="text-gray-300">Cloudflare</strong> — edge worker (PII stripping happens here)</li>
            <li><strong className="text-gray-300">Vercel</strong> — web application hosting</li>
            <li><strong className="text-gray-300">Anthropic</strong> — AI evaluation of traces (redacted content only)</li>
            <li><strong className="text-gray-300">Resend</strong> — transactional email delivery</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Retention</h2>
          <p>Trace data is automatically deleted 90 days after ingestion. Account data is retained until account deletion. You may request deletion at any time by contacting us.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Your rights</h2>
          <p>You may request access to, correction of, or deletion of your data. Contact <a href="mailto:privacy@atlassynapse.ai" className="text-purple-400 hover:text-purple-300">privacy@atlassynapse.ai</a>.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Contact</h2>
          <p><a href="mailto:privacy@atlassynapse.ai" className="text-purple-400 hover:text-purple-300">privacy@atlassynapse.ai</a></p>
        </section>
      </div>
    </div>
  );
}
