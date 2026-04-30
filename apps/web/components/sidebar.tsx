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
  function isActive(href: string): boolean {
    const isOverview = href === "/dashboard";
    if (isOverview) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-800 bg-gray-900 p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 animate-fade-in">
        <div className="relative">
          <Image
            src="/logo.png"
            alt="Atlas Synapse"
            width={34}
            height={34}
            className="rounded-lg logo-float"
          />
        </div>
        <div>
          <span className="text-lg font-bold text-gradient-purple">Atlas Synapse</span>
          <p className="text-xs text-gray-500 tracking-wide">HR for Your AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }, index) => {
          const active = isActive(href);
          return (
            <div key={href} className="relative">
              {/* Active indicator bar */}
              {active && (
                <span className="nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-purple-500 to-purple-300 rounded-full" />
              )}
              <Link
                href={href}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                style={{ animationDelay: `${index * 35}ms` }}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm animate-slide-left nav-item group",
                  active
                    ? "bg-purple-900/50 text-purple-300 nav-item-active"
                    : "text-gray-400 hover:bg-gray-800/80 hover:text-gray-100"
                )}
              >
                <Icon
                  size={16}
                  className={clsx(
                    "transition-transform duration-200",
                    active
                      ? "text-purple-400"
                      : "group-hover:scale-110 group-hover:rotate-6 group-hover:text-purple-400"
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-800 space-y-1 animate-fade-in" style={{ animationDelay: "320ms" }}>
        <p className="text-xs text-gray-600 truncate px-1">{userEmail}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all duration-200 group"
        >
          <LogOut size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:scale-110" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
