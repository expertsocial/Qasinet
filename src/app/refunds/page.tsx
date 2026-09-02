import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | QasiNet",
  description: "Our policies regarding failed transactions and refunds.",
};

export default function RefundsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Refund Policy</h1>
          <p className="text-muted-foreground">Last updated: [Date Editable]</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Failed Transactions</h2>
            <p className="text-muted-foreground leading-relaxed">
              If your Mobile Money payment is successfully deducted but the service provider (e.g., KPLC, Safaricom, DStv) is experiencing downtime, your transaction will be marked as "Pending". Our system will automatically retry the vending process. If it fails permanently, a refund process will be initiated.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Refund Timeframes</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds for permanently failed transactions are typically processed within [EDITABLE: 24 to 48 hours]. The exact time it takes for funds to reflect in your Mobile Money account depends on the payment provider.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. User Errors</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet is not responsible for transactions sent to incorrect phone numbers, meter numbers, or account numbers provided by the user. Once a service is successfully vended to the provided account, the transaction is considered final and cannot be reversed.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a transaction has failed and you have not received an automatic refund within the stipulated timeframe, please contact our support team with your Transaction Reference and phone number.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
