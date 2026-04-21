"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Bot, AlertTriangle, Settings, Shield, Plug, LogOut, Activity, ClipboardCheck, ScrollText } from "lucide-react";
import { clsx } from "clsx";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/traces", label: "Traces", icon: Activity },
  { href: "/dashboard/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/connections", label: "Connections", icon: Plug },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
  { href: "/dashboard/data-transparency", label: "Data Transparency", icon: Shield },
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
    router.push("/login");
    router.refresh();
  }

  // Active check: usePathname() returns path WITHOUT basePath in Next.js App Router.
  // e.g. pathname = "/dashboard/agents", href = "/dashboard/agents"
  function isActive(href: string): boolean {
    const isOverview = href === "/dashboard";
    if (isOverview) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-800 bg-gray-900 p-4">
      <div className="mb-8 flex items-center gap-2">
        <Image src="/logo.png" alt="Atlas Synapse" width={32} height={32} className="rounded" />
        <div>
          <span className="text-lg font-bold text-purple-400">Atlas Synapse</span>
          <p className="text-xs text-gray-500">HR for Your AI</p>
        </div>
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
