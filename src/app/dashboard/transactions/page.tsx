"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Mock data
const mockTransactions = [
  { id: "QSN-1029", service: "Airtime - Safaricom", amount: 500, date: "2026-09-02", status: "SUCCESS" },
  { id: "QSN-1028", service: "KPLC Prepaid", amount: 1500, date: "2026-09-01", status: "SUCCESS" },
  { id: "QSN-1027", service: "Zuku Fiber", amount: 3999, date: "2026-08-28", status: "SUCCESS" },
  { id: "QSN-1026", service: "Airtime - Airtel", amount: 100, date: "2026-08-27", status: "FAILED" },
  { id: "QSN-1025", service: "Data - Safaricom", amount: 1000, date: "2026-08-20", status: "SUCCESS" },
  { id: "QSN-1024", service: "Nairobi Water", amount: 2500, date: "2026-08-15", status: "SUCCESS" },
];

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = mockTransactions.filter(tx => 
    tx.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View and manage all your past purchases.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
        
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID or Service..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filter
          </Button>
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
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === "SUCCESS" 
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
          <span>Showing 1 to {filteredTransactions.length} of {mockTransactions.length} results</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>

      </div>

    </div>
  );
}
