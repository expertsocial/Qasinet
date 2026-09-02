import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Terms | QasiNet",
  description: "Terms and conditions specific to digital services offered on QasiNet.",
};

export default function ServiceTermsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Service Terms</h1>
          <p className="text-muted-foreground">Last updated: [Date Editable]</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Airtime and Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Airtime and data purchases are fulfilled instantly upon payment verification. QasiNet supports major Kenyan networks (Safaricom, Airtel, Telkom, Equitel, Faiba). Availability is subject to the respective network operator's uptime.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. TV Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Payments for TV services (DStv, GOtv, Zuku, StarTimes) require accurate account or smartcard numbers. QasiNet will attempt to verify the account details before processing the payment, where supported by the provider.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Utility Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              For prepaid utilities (e.g., KPLC Tokens), a token will be generated and provided upon successful transaction. For postpaid accounts, the payment will be reflected in your utility account based on the provider's standard processing times.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Provider Pricing</h2>
            <p className="text-muted-foreground leading-relaxed">
              The final price presented on QasiNet includes the service cost and any applicable service fees. Prices are subject to change without prior notice based on supplier adjustments.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
