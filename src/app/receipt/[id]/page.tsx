"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { 
  Printer, 
  Share2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Zap, 
  AlertCircle, 
  ArrowLeft, 
  Mail, 
  Loader2, 
  RefreshCw, 
  ExternalLink, 
  X 
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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
  const [isPolling, setIsPolling] = useState(false);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReceipt = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`/api/transactions/${id}/status`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        return json;
      }
    } catch (e) {
      console.error("Failed to fetch receipt:", e);
    } finally {
      if (!isBackground) setLoading(false);
    }
    return null;
  }, [id]);

  // Initial fetch and automatic polling for pending transactions
  useEffect(() => {
    let mounted = true;

    async function init() {
      const initialData = await fetchReceipt(false);
      if (!mounted || !initialData) return;

      const pendingStates = ["CREATED", "PAYMENT_PENDING", "VENDING_PENDING"];
      if (pendingStates.includes(initialData.state)) {
        setIsPolling(true);

        pollIntervalRef.current = setInterval(async () => {
          const updated = await fetchReceipt(true);
          if (updated && !pendingStates.includes(updated.state)) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsPolling(false);
            if (updated.state === "SUCCESS") {
              toast.success("Transaction completed! Your receipt & token are ready.");
            } else if (updated.state.includes("FAILED")) {
              toast.error("Transaction update: Processing failed.");
            }
          }
        }, 2500);
      }
    }

    init();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchReceipt]);

  const handleManualRefresh = async () => {
    setIsPolling(true);
    const updated = await fetchReceipt(true);
    setIsPolling(false);
    if (updated?.state === "SUCCESS") {
      toast.success("Receipt is up to date!");
    } else {
      toast("Current state: " + (updated?.state || "Unknown"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "QasiNet Receipt",
          text: `Official Receipt for QasiNet transaction ${id}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Receipt link copied to clipboard!");
    }
  };

  const handleCopyToken = (token: string) => {
    const rawClean = token.replace(/[^0-9]/g, "");
    navigator.clipboard.writeText(rawClean);
    setCopied(true);
    toast.success("Token copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/transactions/${id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setEmailSent(true);
        toast.success(`Receipt sent to ${emailInput.trim()}!`);
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailSent(false);
        }, 2000);
      } else {
        toast.error(result.error || "Failed to send email receipt.");
      }
    } catch {
      toast.error("Error connecting to email service. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Format token into readable 4-digit blocks
  const formatTokenDisplay = (rawToken: string) => {
    const cleaned = rawToken.replace(/[^0-9]/g, "");
    if (cleaned.length === 20) {
      return cleaned.match(/.{1,4}/g)?.join(" - ") || rawToken;
    }
    return rawToken;
  };

  const token = data?.metadata?.token;
  const units = data?.metadata?.units;
  const isPending = data?.state === "PAYMENT_PENDING" || data?.state === "VENDING_PENDING" || data?.state === "CREATED";
  const isFailed = data?.state === "PAYMENT_FAILED" || data?.state === "VENDING_FAILED";

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-24 pb-12 bg-muted/30">
      <div className="container mx-auto px-4 flex flex-col items-center">
        
        {/* Actions bar (hidden when printing) */}
        <div className="w-full max-w-2xl flex flex-wrap gap-3 justify-between items-center mb-6 print:hidden">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
          
          <div className="flex flex-wrap gap-2">
            {isPending && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualRefresh} 
                className="gap-1.5 text-primary border-primary/30"
                disabled={isPolling}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? "animate-spin" : ""}`} />
                {isPolling ? "Checking..." : "Refresh"}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setShowEmailModal(true)} 
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Mail className="w-4 h-4" /> Email Receipt
            </Button>
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Live Status In-Progress Banner (Hidden when printing) */}
        {isPending && (
          <div className="w-full max-w-2xl mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {data?.state === "VENDING_PENDING" 
                    ? "Generating token & completing vending..." 
                    : "Confirming M-Pesa payment..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Live tracking active. This receipt updates automatically.
                </p>
              </div>
            </div>
            <Link href={`/track?ref=${encodeURIComponent(id)}&phone=${encodeURIComponent(data?.destination || "")}`}>
              <Button size="sm" variant="outline" className="gap-1 text-xs border-amber-500/30">
                Live Timeline <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Printable Receipt Card */}
        <div className="w-full max-w-2xl bg-card border border-border/50 shadow-xl rounded-3xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* Header */}
          <div className="bg-primary/5 p-8 border-b border-border text-center relative">
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                data?.state === "SUCCESS"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  : isPending
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}>
                {data?.state === "SUCCESS" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    COMPLETED
                  </>
                ) : isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {data?.state === "VENDING_PENDING" ? "VENDING IN PROGRESS" : "PAYMENT PENDING"}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {data?.state || "FAILED"}
                  </>
                )}
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
            <div className="p-6 sm:p-8 bg-gradient-to-b from-amber-500/15 to-amber-500/5 border-b border-amber-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm tracking-wide">
                  <Zap className="w-5 h-5 fill-current" />
                  <span>KPLC PREPAID ELECTRICITY TOKEN</span>
                </div>
                {units && (
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold font-mono">
                    {units} kWh
                  </span>
                )}
              </div>

              <div className="bg-background/90 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 text-center my-3 shadow-inner">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">
                  20-Digit Recharge Code
                </p>
                <p className="text-2xl sm:text-4xl font-mono font-black text-foreground tracking-wider py-1.5 selection:bg-amber-500 selection:text-black">
                  {formatTokenDisplay(token)}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  Key in these 20 digits on your meter keypad (CIU) and press <strong>Enter / Blue Button</strong>.
                </p>
              </div>

              <div className="flex justify-center mt-3 print:hidden">
                <Button 
                  size="sm" 
                  onClick={() => handleCopyToken(token)} 
                  variant="outline"
                  className="gap-2 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Token Copied to Clipboard!" : "Copy Token Code"}
                </Button>
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="p-8 space-y-8">
            
            {/* Primary Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Amount Paid</p>
                <p className="text-3xl font-extrabold text-foreground">
                  KES {data ? Number(data.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "..."}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Date & Time</p>
                <p className="text-sm font-medium text-foreground">
                  {data?.createdAt 
                    ? new Date(data.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }) 
                    : new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
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
                {data?.message && isFailed && (
                  <div className="flex justify-between items-start text-red-500">
                    <span className="text-sm font-medium">Failure Reason</span>
                    <span className="text-sm font-medium text-right">{data.message}</span>
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
                  <span className="text-sm font-mono font-semibold text-primary">{data?.paymentRef || (isPending ? "AWAITING M-PESA" : "CONFIRMED")}</span>
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

        {/* Action Link to Tracker */}
        <div className="mt-6 text-center print:hidden">
          <Link 
            href={`/track?ref=${encodeURIComponent(id)}&phone=${encodeURIComponent(data?.destination || "")}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Track detailed timeline for this transaction <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* Email Receipt Modal Dialog */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowEmailModal(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Email Official Receipt</h3>
                <p className="text-xs text-muted-foreground">Receive receipt and token in your inbox</p>
              </div>
            </div>

            {emailSent ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-semibold text-foreground">Receipt Dispatched!</p>
                <p className="text-xs text-muted-foreground">Check your inbox at {emailInput}</p>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label htmlFor="email-recipient" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Email Address
                  </label>
                  <input
                    id="email-recipient"
                    type="email"
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    We will send a formatted digital receipt and token to this email address.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1"
                    disabled={isSendingEmail}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 gap-2"
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Receipt
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
