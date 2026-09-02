"use client";

import React, { use } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Printer, Share2, CheckCircle2, Download } from "lucide-react";
import Link from "next/link";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Mock receipt data based on ID
  const receiptData = {
    transactionId: id,
    date: new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }),
    service: "Airtime - Safaricom",
    customerName: "Guest User",
    destination: "0712 345 678",
    amount: "KES 500.00",
    status: "SUCCESSFUL",
    providerRef: "QHTY7829JD",
    paymentRef: "PAY-9928172"
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QasiNet Receipt',
          text: `Receipt for transaction ${receiptData.transactionId}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert("Web Share API is not supported in your browser.");
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-24 pb-12 bg-muted/30">
      <div className="container mx-auto px-4 flex flex-col items-center">
        
        {/* Actions bar (hidden when printing) */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-6 print:hidden">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
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
        <div className="w-full max-w-2xl bg-card border border-border/50 shadow-xl rounded-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* Header */}
          <div className="bg-primary/5 p-8 border-b border-border text-center relative">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {receiptData.status}
              </span>
            </div>
            
            <div className="w-16 h-16 mx-auto mb-4 relative rounded-xl overflow-hidden shadow-sm">
              <Image 
                src="/logos/qasinet-logo.jpeg" 
                alt="QasiNet" 
                fill 
                sizes="64px"
                className="object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction Receipt</h1>
            <p className="text-sm text-muted-foreground mt-1">Thank you for using QasiNet</p>
          </div>

          {/* Details */}
          <div className="p-8 space-y-8">
            
            {/* Primary Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Amount Paid</p>
                <p className="text-2xl font-bold text-foreground">{receiptData.amount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Date & Time</p>
                <p className="text-sm font-medium text-foreground">{receiptData.date}</p>
              </div>
            </div>

            <div className="h-px bg-border border-dashed" />

            {/* Service Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Service Details</h3>
              <div className="bg-muted/30 rounded-xl p-5 border border-border/50 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <span className="text-sm font-medium text-foreground text-right">{receiptData.service}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Destination / Account</span>
                  <span className="text-sm font-medium text-foreground text-right">{receiptData.destination}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Customer Name</span>
                  <span className="text-sm font-medium text-foreground text-right">{receiptData.customerName}</span>
                </div>
              </div>
            </div>

            {/* Reference Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Reference Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Transaction ID</span>
                  <span className="text-sm font-mono text-foreground">{receiptData.transactionId}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Provider Ref</span>
                  <span className="text-sm font-mono text-foreground">{receiptData.providerRef}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Payment Ref</span>
                  <span className="text-sm font-mono text-foreground">{receiptData.paymentRef}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-muted/50 p-6 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">
              If you have any questions regarding this transaction, please contact our support team with the Transaction ID.
            </p>
            <p className="text-xs font-medium mt-2">www.qasinet.com</p>
          </div>

        </div>
      </div>
    </div>
  );
}
