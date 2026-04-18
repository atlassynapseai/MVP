"use client";

import { useEffect } from "react";
import { basePath } from "@/lib/app-path";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error.digest ?? "no digest");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-4">
      <p className="text-4xl font-bold text-red-500">!</p>
      <h1 className="text-lg font-semibold text-gray-100">Something went wrong</h1>
      <p className="text-sm text-gray-400">
        An unexpected error occurred loading this page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 transition-colors"
        >
          Try again
        </button>
        <Link
          href={`${basePath}/dashboard`}
          className="px-4 py-2 text-sm rounded border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
