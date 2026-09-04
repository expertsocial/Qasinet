"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { 
  ArrowUpRight, 
  Smartphone, 
  Wifi, 
  Zap, 
  Tv, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Receipt,
  Sparkles,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DashboardData {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  metrics: {
    totalSpent: number;
    thisMonthSpent: number;
    lastMonthSpent: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    successRate: number;
    activeServicesCount: number;
  };
  recentTransactions: Array<{
    id: string;
    reference: string;
    serviceName: string;
    serviceSlug: string;
    serviceType: string;
    productName: string | null;
    destination: string;
    amount: number;
    status: string;
    failureReason: string | null;
    paymentReference: string | null;
    date: string;
  }>;
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/user/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "FAILED":
      case "PAYMENT_FAILED":
      case "VENDING_FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "VENDING_PENDING":
      case "PAYMENT_PENDING":
      case "CREATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3 h-3" /> Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border">
            {status}
          </span>
        );
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case "airtime":
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case "data":
        return <Wifi className="w-4 h-4 text-sky-500" />;
      case "electricity":
        return <Zap className="w-4 h-4 text-amber-500" />;
      case "tv":
        return <Tv className="w-4 h-4 text-indigo-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-primary" />;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted/60 rounded-2xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border/80 rounded-3xl" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border/80 rounded-3xl" />
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalSpent: 0,
    thisMonthSpent: 0,
    totalTransactions: 0,
    successRate: 100,
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Welcome back, {user?.fullName?.split(" ")[0] || "Member"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your digital purchases, automated utility payments, and transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDashboardData} 
            className="rounded-full gap-2 text-xs font-semibold h-9"
          >
            <RefreshCw className={isLoading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
            Refresh
          </Button>
          <Link href="/services/airtime">
            <Button size="sm" className="rounded-full gap-1.5 text-xs font-semibold h-9 shadow-sm">
              <Zap className="w-3.5 h-3.5" /> Buy Airtime / Data
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Spent */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Purchases</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">
            KES {metrics.totalSpent.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Lifetime across all utilities
          </p>
        </div>

        {/* This Month */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Month</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">
            KES {metrics.thisMonthSpent.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Current billing cycle spend
          </p>
        </div>

        {/* Total Orders */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transactions</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">
            {metrics.totalTransactions}
          </p>
          <p className="text-xs text-muted-foreground">
            Completed service requests
          </p>
        </div>

        {/* Success Rate */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Delivery Rate</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.successRate}%
          </p>
          <p className="text-xs text-muted-foreground">
            Automated M-Pesa fulfillment
          </p>
        </div>

      </div>

      {/* Quick Service Launchpad Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Instant Purchase Shortcuts
          </h2>
          <Link href="/services" className="text-xs font-semibold text-primary hover:underline">
            All Services →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link 
            href="/services/airtime"
            className="p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Airtime Top-Up</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Safaricom, Airtel, Telkom</p>
          </Link>

          <Link 
            href="/services/data"
            className="p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Wifi className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Data Bundles</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Daily, weekly & monthly</p>
          </Link>

          <Link 
            href="/services/electricity"
            className="p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Electricity Tokens</h3>
            <p className="text-xs text-muted-foreground mt-0.5">KPLC Prepaid & Postpaid</p>
          </Link>

          <Link 
            href="/services/tv"
            className="p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Tv className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">TV Subscriptions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">DStv, GOtv, Zuku, StarTimes</p>
          </Link>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-card border border-border/80 rounded-3xl shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your latest purchases and real-time statuses</p>
          </div>
          <Link href="/dashboard/transactions">
            <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold">
              View Full History <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {data?.recentTransactions && data.recentTransactions.length > 0 ? (
          <div className="divide-y divide-border/50">
            {data.recentTransactions.slice(0, 6).map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-muted/80 flex items-center justify-center shrink-0 border border-border/60">
                    {getServiceIcon(tx.serviceType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {tx.serviceName}
                      </span>
                      {tx.productName && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          • {tx.productName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{tx.destination}</span>
                      <span>•</span>
                      <span>{new Date(tx.date).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-foreground">
                      KES {Number(tx.amount).toLocaleString()}
                    </p>
                    <div className="mt-0.5">
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>

                  <Link href={`/receipt/${tx.reference}`}>
                    <Button variant="ghost" size="sm" className="rounded-full h-8 px-3 text-xs gap-1">
                      Receipt <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-foreground text-sm">No transactions recorded yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your recent top-ups, bundles, and bills will automatically appear here once you make your first purchase.
            </p>
            <Link href="/services/airtime">
              <Button size="sm" className="rounded-full mt-2">
                Make Your First Purchase
              </Button>
            </Link>
          </div>
        )}

      </div>

    </div>
  );
}
