"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  History, 
  Users, 
  UserCircle, 
  LogOut, 
  CreditCard,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/dashboard/transactions", icon: History },
  { name: "Saved Beneficiaries", href: "/dashboard/saved", icon: Users },
  { name: "Profile & Security", href: "/dashboard/profile", icon: UserCircle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen pt-24 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading your account...</p>
        </div>
      </div>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "QN";

  return (
    <div className="min-h-screen bg-muted/20 text-foreground pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6 sticky top-24">
              
              {/* User Brief Card */}
              <div className="flex items-center gap-3 pb-5 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-sm text-foreground truncate">{user.fullName}</h2>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{user.phone || user.email}</p>
                </div>
              </div>

              {/* Quick Action Button */}
              <div>
                <Link href="/services/airtime" className="block">
                  <Button className="w-full justify-center gap-2 font-medium shadow-sm">
                    <CreditCard className="w-4 h-4" /> Quick Top-Up
                  </Button>
                </Link>
              </div>

              {/* Nav items */}
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Services Directory Link */}
              <div className="pt-4 border-t border-border">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Explore Services
                </p>
                <div className="space-y-1 text-xs">
                  <Link href="/services/airtime" className="flex items-center justify-between px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <span>Airtime Top-Up</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                  <Link href="/services/data" className="flex items-center justify-between px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <span>Data Bundles</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                  <Link href="/services/electricity" className="flex items-center justify-between px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <span>KPLC Electricity</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                  <Link href="/services/tv" className="flex items-center justify-between px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <span>TV & Entertainment</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                </div>
              </div>

              {/* Sign out */}
              <div className="pt-4 border-t border-border">
                <button 
                  onClick={logout}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

        </div>

      </div>
    </div>
  );
}
