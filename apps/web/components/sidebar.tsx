"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, AlertTriangle, Settings, Shield } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { clsx } from "clsx";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/data-transparency", label: "Data Transparency", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-800 bg-gray-900 p-4">
      <div className="mb-6">
        <span className="text-lg font-bold text-purple-400">Atlas Synapse</span>
        <p className="text-xs text-gray-500">HR for Your AI</p>
      </div>
      <div className="mb-6">
        <OrganizationSwitcher appearance={{ elements: { rootBox: "w-full" } }} />
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-purple-900/50 text-purple-300"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-800">
        <UserButton showName />
      </div>
    </aside>
  );
}
