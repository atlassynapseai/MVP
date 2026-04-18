import Link from "next/link";
import { basePath } from "@/lib/app-path";

export default function TermsPage() {
  const updated = "2026-04-18";
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href={`${basePath}/dashboard`} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-100 mt-4 mb-1">Terms of Service</h1>
          <p className="text-xs text-gray-500">Last updated: {updated}</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Acceptance</h2>
          <p>By using Atlas Synapse you agree to these terms. If you do not agree, do not use the service.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Service</h2>
          <p>Atlas Synapse provides AI agent monitoring tools including trace ingestion, evaluation, incident detection, and alerting. The service is provided as-is. We do not guarantee uptime, accuracy of evaluations, or fitness for any particular purpose.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Your content</h2>
          <p>You retain ownership of all data you submit. By submitting data you grant us a limited license to process it to provide the service. Do not submit data that you do not have the right to share.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Prohibited use</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Do not use the service to process data you are not authorized to access</li>
            <li>Do not attempt to circumvent rate limits, security controls, or access another org&apos;s data</li>
            <li>Do not use the service for illegal purposes</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Limitation of liability</h2>
          <p>To the maximum extent permitted by law, Atlas Synapse is not liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability to you for any cause of action is limited to the amounts paid by you in the 12 months preceding the claim.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Changes</h2>
          <p>We may update these terms. Continued use after changes constitutes acceptance of the new terms.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-gray-200">Contact</h2>
          <p><a href="mailto:legal@atlassynapse.ai" className="text-purple-400 hover:text-purple-300">legal@atlassynapse.ai</a></p>
        </section>
      </div>
    </div>
  );
}
