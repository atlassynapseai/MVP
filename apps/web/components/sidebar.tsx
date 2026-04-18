"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Bot, AlertTriangle, Settings, Shield, Plug, LogOut, Activity, ClipboardCheck, ScrollText } from "lucide-react";
import { clsx } from "clsx";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { basePath } from "@/lib/app-path";

const NAV = [
  { href: `${basePath}/dashboard`, label: "Overview", icon: LayoutDashboard },
  { href: `${basePath}/dashboard/agents`, label: "Agents", icon: Bot },
  { href: `${basePath}/dashboard/traces`, label: "Traces", icon: Activity },
  { href: `${basePath}/dashboard/evaluations`, label: "Evaluations", icon: ClipboardCheck },
  { href: `${basePath}/dashboard/incidents`, label: "Incidents", icon: AlertTriangle },
  { href: `${basePath}/dashboard/connections`, label: "Connections", icon: Plug },
  { href: `${basePath}/dashboard/settings`, label: "Settings", icon: Settings },
  { href: `${basePath}/dashboard/audit`, label: "Audit Log", icon: ScrollText },
  { href: `${basePath}/dashboard/data-transparency`, label: "Data Transparency", icon: Shield },
];

interface SidebarProps {
  userEmail: string;
  onNavigate?: () => void;
}

export function Sidebar({ userEmail, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push(`${basePath}/login`);
    router.refresh();
  }

  // Active check works whether usePathname returns the full path (e.g. /MVP/dashboard)
  // or the Vercel-rewritten path (e.g. /dashboard).
  // Overview uses exact match; other routes also match child paths (e.g. /agents/[id]).
  function isActive(href: string): boolean {
    const stripped = basePath && href.startsWith(basePath) ? href.slice(basePath.length) || "/" : href;
    const isOverview = href === `${basePath}/dashboard` || href === "/dashboard";
    if (isOverview) return pathname === href || pathname === stripped;
    return (
      pathname === href ||
      pathname === stripped ||
      pathname.startsWith(href + "/") ||
      pathname.startsWith(stripped + "/")
    );
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-800 bg-gray-900 p-4">
      <div className="mb-8">
        <span className="text-lg font-bold text-purple-400">Atlas Synapse</span>
        <p className="text-xs text-gray-500">HR for Your AI</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive(href)
                ? "bg-purple-900/50 text-purple-300"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-800 space-y-2">
        <p className="text-xs text-gray-500 truncate px-1">{userEmail}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
