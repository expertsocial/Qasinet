"use client";

import React, { use, useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Printer, Share2, CheckCircle2, Copy, Check, Zap, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TransactionDetails {
  state: string;
  providerRef?: string;
  paymentRef?: string;
  reference: string;
  amount: number;
  destination: string;
  service?: {
    name?: string;
    slug?: string;
    type?: string;
  };
  metadata?: {
    token?: string;
    units?: string | number;
    accountName?: string;
    utilityType?: string;
    package?: string;
    validity?: string;
  };
  createdAt?: string;
  message?: string;
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const res = await fetch(`/api/transactions/${id}/status`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to fetch receipt:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "QasiNet Receipt",
          text: `Receipt for transaction ${id}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Receipt link copied to clipboard!");
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const token = data?.metadata?.token;
  const units = data?.metadata?.units;
  const isElectricity = data?.service?.type === "electricity" || data?.service?.slug?.includes("kplc");

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-24 pb-12 bg-muted/30">
      <div className="container mx-auto px-4 flex flex-col items-center">
        
        {/* Actions bar (hidden when printing) */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-6 print:hidden">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Printable Receipt Area */}
        <div className="w-full max-w-2xl bg-card border border-border/50 shadow-xl rounded-3xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* Header */}
          <div className="bg-primary/5 p-8 border-b border-border text-center relative">
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                data?.state === "SUCCESS"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  : data?.state === "VENDING_PENDING"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {data?.state === "SUCCESS" ? "COMPLETED" : data?.state || "SUCCESSFUL"}
              </span>
            </div>
            
            <div className="w-16 h-16 mx-auto mb-4 relative rounded-2xl overflow-hidden shadow-sm">
              <Image 
                src="/logos/qasinet-logo.jpeg" 
                alt="QasiNet" 
                fill 
                sizes="64px"
                className="object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Official Receipt</h1>
            <p className="text-sm text-muted-foreground mt-1">Instant Utility Vending & Payments</p>
          </div>

          {/* KPLC TOKEN BANNER (If Token is Present) */}
          {token && (
            <div className="p-6 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                <Zap className="w-5 h-5 fill-current" />
                <span>KPLC PREPAID ELECTRICITY TOKEN</span>
              </div>
              <div className="bg-background border-2 border-amber-500/40 rounded-2xl p-5 text-center my-2 shadow-inner">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">Your 20-Digit Token</p>
                <p className="text-2xl sm:text-3xl font-mono font-extrabold text-foreground tracking-wider py-1">
                  {token}
                </p>
                {units && (
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    Units Generated: <strong className="text-foreground">{units} kWh</strong>
                  </p>
                )}
              </div>
              <div className="flex justify-center mt-3 print:hidden">
                <Button 
                  size="sm" 
                  onClick={() => handleCopyToken(token)} 
                  variant="outline"
                  className="gap-2 border-amber-500/30 text-amber-700 dark:text-amber-300"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Token Copied!" : "Copy Token Code"}
                </Button>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="p-8 space-y-8">
            
            {/* Primary Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Amount Paid</p>
                <p className="text-3xl font-extrabold text-foreground">
                  KES {data ? Number(data.amount).toLocaleString() : "..."}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Date & Time</p>
                <p className="text-sm font-medium text-foreground">
                  {data?.createdAt ? new Date(data.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }) : new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                </p>
              </div>
            </div>

            <div className="h-px bg-border border-dashed" />

            {/* Service Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Transaction Summary</h3>
              <div className="bg-muted/30 rounded-2xl p-5 border border-border/50 space-y-3.5">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <span className="text-sm font-semibold text-foreground text-right">{data?.service?.name || "Utility Recharge"}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Account / Destination</span>
                  <span className="text-sm font-mono font-medium text-foreground text-right">{data?.destination || "..."}</span>
                </div>
                {data?.metadata?.accountName && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <span className="text-sm font-medium text-foreground text-right">{data.metadata.accountName}</span>
                  </div>
                )}
                {data?.metadata?.package && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Package</span>
                    <span className="text-sm font-medium text-foreground text-right">{data.metadata.package}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reference Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Payment & Provider Audit</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">QasiNet Reference</span>
                  <span className="text-sm font-mono font-semibold text-foreground">{data?.reference || id}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">M-Pesa Receipt</span>
                  <span className="text-sm font-mono font-semibold text-primary">{data?.paymentRef || "CONFIRMED"}</span>
                </div>
                {data?.providerRef && (
                  <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Provider Reference</span>
                    <span className="text-sm font-mono text-foreground">{data.providerRef}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-muted/50 p-6 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">
              This receipt is automatically generated and verified. If you need any assistance, reach out to support with reference <strong>{data?.reference || id}</strong>.
            </p>
            <p className="text-xs font-semibold mt-2 text-primary">QasiNet • Instant Digital Utilities</p>
          </div>

        </div>
      </div>
    </div>
  );
}
