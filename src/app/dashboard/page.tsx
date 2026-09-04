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
  Globe, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Copy,
  Check,
  RefreshCw
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Success
          </span>
        );
      case "FAILED":
      case "PAYMENT_FAILED":
      case "VENDING_FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3 h-3" /> Processing
          </span>
        );
    }
  };

  const getServiceLink = (serviceSlug: string) => {
    if (serviceSlug.includes("airtime")) return "/services/airtime";
    if (serviceSlug.includes("data")) return "/services/data";
    if (serviceSlug.includes("electricity") || serviceSlug.includes("kplc")) return "/services/electricity";
    if (serviceSlug.includes("tv") || serviceSlug.includes("dstv") || serviceSlug.includes("gotv")) return "/services/tv";
    if (serviceSlug.includes("internet") || serviceSlug.includes("fiber") || serviceSlug.includes("zuku")) return "/services/internet";
    return "/services/airtime";
  };

  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "Member";

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              Personal Account
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of your services, payments, and account activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link href="/services/airtime">
            <Button size="sm" className="gap-2 font-medium">
              <CreditCard className="w-3.5 h-3.5" /> Buy Airtime / Data
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Metric 1: Total Spent */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Spent
            </span>
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground font-mono">
              KES {data?.metrics.totalSpent?.toLocaleString() ?? "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <span>This month:</span>
              <strong className="text-foreground font-mono font-medium">
                KES {data?.metrics.thisMonthSpent?.toLocaleString() ?? "0"}
              </strong>
            </p>
          </div>
        </div>

        {/* Metric 2: Completed Transactions */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Orders
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground font-mono">
              {data?.metrics.successfulTransactions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Out of <span className="font-mono text-foreground font-medium">{data?.metrics.totalTransactions ?? 0}</span> total orders ({data?.metrics.successRate ?? 100}% delivery rate)
            </p>
          </div>
        </div>

        {/* Metric 3: Quick Pay / Saved Contacts */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary font-medium">
              Saved Beneficiaries
            </span>
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Store frequently used phone numbers and meter accounts for instant 1-click checkout.
            </p>
            <Link 
              href="/dashboard/saved" 
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Manage Saved Beneficiaries <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Quick Services Launcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Quick Services</h2>
          <span className="text-xs text-muted-foreground">Instant automated vending</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/services/airtime" className="group bg-card border border-border hover:border-primary/50 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Airtime Top-Up</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Safaricom, Airtel, Telkom</p>
          </Link>

          <Link href="/services/data" className="group bg-card border border-border hover:border-primary/50 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Wifi className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Data Bundles</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Daily, Weekly, Monthly</p>
          </Link>

          <Link href="/services/electricity" className="group bg-card border border-border hover:border-primary/50 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">KPLC Electricity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Prepaid & Postpaid</p>
          </Link>

          <Link href="/services/tv" className="group bg-card border border-border hover:border-primary/50 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">TV Subscriptions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">DStv, GOtv, StarTimes</p>
          </Link>

          <Link href="/services/internet" className="group bg-card border border-border hover:border-primary/50 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Internet & Fiber</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Zuku, Faiba, Pozi</p>
          </Link>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-foreground">Recent Transactions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest purchases made on your account</p>
          </div>
          <Link href="/dashboard/transactions">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary gap-1 font-medium text-xs">
              View Full History <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Loading recent transactions...</p>
          </div>
        ) : data?.recentTransactions && data.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-semibold text-muted-foreground uppercase bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Reference / M-Pesa</th>
                  <th className="px-5 py-3.5">Service & Recipient</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-foreground">
                        <span>{tx.reference}</span>
                        <button
                          onClick={() => handleCopy(tx.reference)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                          title="Copy reference"
                        >
                          {copiedRef === tx.reference ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {tx.paymentReference && (
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          M-Pesa: {tx.paymentReference}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground text-sm">{tx.serviceName}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {tx.destination}
                        {tx.productName && <span className="ml-1.5 text-foreground/80">• {tx.productName}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-foreground">
                      KES {tx.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Link href={`/receipt/${tx.reference}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                          Receipt
                        </Button>
                      </Link>
                      <Link href={getServiceLink(tx.serviceSlug)}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                          Repeat
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">No transactions yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Once you make an airtime top-up, buy data bundles, or pay utility bills, your live receipts and delivery status will appear here.
              </p>
            </div>
            <div>
              <Link href="/services/airtime">
                <Button className="gap-2 shadow-sm font-medium">
                  <Smartphone className="w-4 h-4" /> Top-Up Airtime Now
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
