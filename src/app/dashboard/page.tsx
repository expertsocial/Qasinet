"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import { ArrowUpRight, ArrowDownRight, Activity, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

// Mock data
const recentTransactions = [
  { id: "QSN-1029", service: "Airtime - Safaricom", amount: 500, date: "2026-09-02", status: "SUCCESS" },
  { id: "QSN-1028", service: "KPLC Prepaid", amount: 1500, date: "2026-09-01", status: "SUCCESS" },
  { id: "QSN-1027", service: "Zuku Fiber", amount: 3999, date: "2026-08-28", status: "SUCCESS" },
];

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {user?.fullName.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your account today.
          </p>
        </div>
        <Link href="/services/airtime">
          <Button className="gap-2">
            <CreditCard className="w-4 h-4" /> New Purchase
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Spent This Month</p>
              <h3 className="text-3xl font-bold">KES 5,999</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-500 flex items-center font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" /> 12%
            </span>
            <span className="text-muted-foreground ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Transactions</p>
              <h3 className="text-3xl font-bold">14</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-500 flex items-center font-medium">
              <ArrowDownRight className="w-4 h-4 mr-1" /> 2
            </span>
            <span className="text-muted-foreground ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col justify-center bg-gradient-to-br from-primary/5 to-primary/10">
          <h3 className="font-semibold text-lg mb-2">Saved Beneficiaries</h3>
          <p className="text-sm text-muted-foreground mb-4">You have 5 saved numbers for quick top-ups.</p>
          <Link href="/dashboard/saved" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
            Manage Beneficiaries <ArrowUpRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link href="/dashboard/transactions" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Transaction ID</th>
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <Link href={`/receipt/${tx.id}`} className="hover:underline">
                      {tx.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{tx.service}</td>
                  <td className="px-6 py-4 font-medium text-right">KES {tx.amount}</td>
                  <td className="px-6 py-4 text-muted-foreground">{tx.date}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
