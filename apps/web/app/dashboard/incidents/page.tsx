export default function IncidentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Incidents</h1>
      <p className="text-gray-400 text-sm mb-6">Flagged failures, in plain English.</p>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
        No incidents. When agents fail silently, they appear here.
      </div>
    </div>
  );
}
