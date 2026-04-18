"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console — do not expose error details to users.
    console.error("[GlobalError]", error.digest ?? "no digest");
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-5xl font-bold text-red-500 mb-4">!</p>
          <h1 className="text-xl font-semibold text-gray-100 mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-8">An unexpected error occurred.</p>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
