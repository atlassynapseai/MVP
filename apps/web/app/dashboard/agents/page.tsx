export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Agents</h1>
      <p className="text-gray-400 text-sm mb-6">Your connected AI agents and their performance.</p>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
        No agents yet. Traces will appear here once connected.
      </div>
    </div>
  );
}
