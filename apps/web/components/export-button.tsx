"use client";

export function ExportButton({ type }: { type: "incidents" | "traces" }) {
  function handleClick() {
    window.location.href = `/api/export?type=${type}`;
  }
  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
    >
      Export CSV
    </button>
  );
}
