export default function DataTransparencyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Data Transparency</h1>
      <p className="text-gray-400 text-sm mb-6">Exactly what Atlas Synapse stores — and what it strips.</p>
      <div className="grid gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h2 className="font-semibold text-gray-200 mb-2">What we strip (at the edge, before storage)</h2>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Email addresses → <code className="text-purple-300">[EMAIL]</code></li>
            <li>Phone numbers → <code className="text-purple-300">[PHONE]</code></li>
            <li>Social Security Numbers → <code className="text-purple-300">[SSN]</code></li>
            <li>Credit/debit card numbers → <code className="text-purple-300">[CARD]</code></li>
            <li>Street addresses → <code className="text-purple-300">[ADDRESS]</code></li>
          </ul>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h2 className="font-semibold text-gray-200 mb-2">What we store</h2>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Redacted prompt and response content</li>
            <li>Tool call names and sanitized inputs/outputs</li>
            <li>Timestamps, token counts, cost estimates</li>
            <li>Evaluation scores and plain-English summaries</li>
          </ul>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h2 className="font-semibold text-gray-200 mb-2">Retention</h2>
          <p className="text-sm text-gray-400">All data deleted after 90 days. Deletion on request.</p>
        </div>
      </div>
    </div>
  );
}
