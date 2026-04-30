"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X } from "lucide-react";

export function MobileSidebarWrapper({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 md:hidden">
        <span className="text-sm font-bold text-gradient-purple">Atlas Synapse</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-gray-400 hover:text-purple-400 transition-colors duration-200 p-1 rounded-lg hover:bg-purple-900/30"
          aria-label="Toggle menu"
        >
          <span
            className="block transition-transform duration-300"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </span>
        </button>
      </div>

      {/* Overlay */}
      <div
        className="fixed inset-0 z-20 md:hidden transition-all duration-300"
        style={{
          background: open ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
          backdropFilter: open ? "blur(2px)" : "none",
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
        }}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar — spring slide on mobile, static on desktop */}
      <div
        className="fixed inset-y-0 left-0 z-20 md:static md:translate-x-0 md:flex md:shrink-0"
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: open
            ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Sidebar userEmail={userEmail} onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
