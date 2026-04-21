import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-5xl font-bold text-purple-500 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-100 mb-2">Page not found</h1>
        <p className="text-gray-400 text-sm mb-8">This page doesn&apos;t exist or was moved.</p>
        <Link
          href={`/dashboard`}
          className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
