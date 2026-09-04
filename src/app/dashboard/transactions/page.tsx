"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface TransactionItem {
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
}

export default function TransactionsHistoryPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        status: statusFilter,
        search: searchTerm
      });
      const res = await fetch(`/api/user/transactions?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load user transactions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

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
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete database record of all your utility purchases, airtime, and bundles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Reference, M-Pesa code, Phone, or Service..." 
              className="pl-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {[
              { label: "All", value: "ALL" },
              { label: "Successful", value: "SUCCESS" },
              { label: "Pending", value: "PENDING" },
              { label: "Failed", value: "FAILED" }
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Fetching transaction records from database...</p>
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-semibold text-muted-foreground uppercase bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5">Reference ID</th>
                    <th className="px-5 py-3.5">Service & Details</th>
                    <th className="px-5 py-3.5">Recipient</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      
                      {/* Reference ID & Mpesa */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                          <span>{tx.reference}</span>
                          <button
                            onClick={() => handleCopy(tx.reference)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                            title="Copy reference"
                          >
                            {copiedRef === tx.reference ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {tx.paymentReference && (
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            M-Pesa: <span className="font-semibold text-foreground/90">{tx.paymentReference}</span>
                          </div>
                        )}
                      </td>

                      {/* Service & Product */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground text-sm">{tx.serviceName}</div>
                        {tx.productName && (
                          <div className="text-xs text-muted-foreground font-medium mt-0.5">
                            {tx.productName}
                          </div>
                        )}
                      </td>

                      {/* Destination */}
                      <td className="px-5 py-4 font-mono text-xs font-medium text-foreground">
                        {tx.destination}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 text-right font-mono font-bold text-foreground">
                        KES {tx.amount.toLocaleString()}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {getStatusBadge(tx.status)}
                      </td>

                      {/* Receipt Action */}
                      <td className="px-5 py-4 text-right">
                        <Link href={`/receipt/${tx.reference}`}>
                          <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1">
                            <span>Receipt</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Button>
                        </Link>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
              <span>
                Showing {transactions.length} results (Page {page} of {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="gap-1 h-8 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="gap-1 h-8 text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">No transactions match your filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search keywords or switching the status filter tab to view other records.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
