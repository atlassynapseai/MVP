"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X } from "lucide-react";

export function MobileSidebarWrapper({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 md:hidden">
        <span className="text-sm font-bold text-purple-400">Atlas Synapse</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-gray-400 hover:text-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile (slide in), static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-20 transform transition-transform duration-200 md:static md:translate-x-0 md:flex md:shrink-0 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <Sidebar userEmail={userEmail} onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
