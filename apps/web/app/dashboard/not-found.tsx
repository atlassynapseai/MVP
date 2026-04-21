import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-4">
      <p className="text-4xl font-bold text-purple-500">404</p>
      <h1 className="text-lg font-semibold text-gray-100">Not found</h1>
      <p className="text-sm text-gray-400">
        This resource doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href={`/dashboard`}
        className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
