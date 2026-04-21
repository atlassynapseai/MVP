"use client";

import { useState } from "react";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(`${basePath}/api/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Failed to send invite");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          required
          className="flex-1 px-3 py-2 text-sm rounded border border-gray-700 bg-gray-950 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-700 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "sending" || !email.trim()}
          className="px-4 py-2 text-sm rounded bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {status === "sending" ? "Sending…" : "Send Invite"}
        </button>
      </div>
      {status === "sent" && <p className="text-sm text-emerald-400">Invite sent ✓</p>}
      {status === "error" && <p className="text-sm text-red-400">{errorMsg}</p>}
    </form>
  );
}
