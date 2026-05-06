"use client";

import { basePath } from "@/lib/app-path";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "check_email">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const authCallbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}${basePath}/auth/callback`
    : `${appUrl}${basePath}/auth/callback`;

  async function handleGitHub() {
    setStatus("loading");
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: authCallbackUrl },
    });
  }

  async function handleGoogle() {
    setStatus("loading");
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const supabase = getSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authCallbackUrl },
      });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else {
        setStatus("check_email");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  if (status === "check_email") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-2xl font-bold text-purple-400 mb-3">Check your email</p>
          <p className="text-gray-400 text-sm">
            We sent a confirmation link to <strong className="text-gray-200">{email}</strong>.
            Click it to activate your account, then come back to sign in.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 text-xs text-gray-500 hover:text-gray-300 underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Image src="/logo.png" alt="Atlas Synapse" width={40} height={40} className="rounded" />
            <p className="text-2xl font-bold text-purple-400">Atlas Synapse</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">HR for Your AI</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-800 overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "signin"
                ? "bg-gray-800 text-gray-100"
                : "bg-gray-950 text-gray-500 hover:text-gray-300"
              }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "signup"
                ? "bg-gray-800 text-gray-100"
                : "bg-gray-950 text-gray-500 hover:text-gray-300"
              }`}
          >
            Sign up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === "loading"
              ? mode === "signup" ? "Creating account…" : "Signing in…"
              : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={status === "loading"}
          className="w-full py-2.5 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={handleGitHub}
          disabled={status === "loading"}
          className="w-full mt-2 py-2.5 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {mode === "signup" ? "Sign up with GitHub" : "Continue with GitHub"}
        </button>
      </div>
    </div>
  );
}
