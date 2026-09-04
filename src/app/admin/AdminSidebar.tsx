"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ReceiptText, 
  Users, 
  Layers, 
  BarChart3, 
  Network, 
  LifeBuoy, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Zap,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Executive Hub", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Transactions", href: "/admin/transactions", icon: ReceiptText },
  { name: "Kyanda Ops", href: "/admin/kyanda", icon: Network, badge: "Live" },
  { name: "Services & Pricing", href: "/admin/services", icon: Layers },
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Financial Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
];

export function AdminSidebar({ userEmail, userName }: { userEmail: string; userName?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-neutral-950 border-b border-neutral-800 text-white z-40 sticky top-0">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="text-white font-extrabold tracking-tight">QasiNet <span className="text-emerald-500 text-xs font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 ml-1">Admin</span></span>
        </Link>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-neutral-950/95 backdrop-blur-xl border-r border-neutral-800/80 flex flex-col transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Brand Header */}
        <div className="p-6 border-b border-neutral-800/60 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400 fill-current" />
              </div>
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                QasiNet
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">HQ</span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">Operations Center</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Navigation</div>
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group",
                  isActive 
                    ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm shadow-emerald-500/10" 
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-emerald-400" : "text-neutral-400 group-hover:text-neutral-200")} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer & User Card */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/60 space-y-2">
          <Link
            href="/admin/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              pathname === "/admin/settings" 
                ? "bg-neutral-800 text-white" 
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Keys</span>
          </Link>

          <div className="pt-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                {(userName?.[0] || userEmail[0] || "A").toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-neutral-200 truncate">{userName || "Admin"}</p>
                <p className="text-[10px] text-neutral-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          <form action="/auth/signout" method="post" className="pt-1">
            <button 
              type="submit" 
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
