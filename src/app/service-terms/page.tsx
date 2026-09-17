import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Terms",
  description: "Terms and fulfillment conditions specific to mobile airtime and data bundles offered on QasiNet.",
  alternates: {
    canonical: "/service-terms",
  },
  openGraph: {
    title: "Service Terms | QasiNet",
    description: "Terms and fulfillment conditions specific to mobile airtime and data bundles offered on QasiNet.",
  },
};

export default function ServiceTermsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Service Terms</h1>
          <p className="text-muted-foreground">Last updated: September 2026</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Airtime Top-ups</h2>
            <p className="text-muted-foreground leading-relaxed">
              Airtime purchases across Safaricom, Airtel, Telkom, Equitel, and Faiba are fulfilled automatically upon M-Pesa payment confirmation. Airtime credit is delivered straight to the destination mobile number provided at checkout. Service availability is subject to the respective telecom operator&apos;s real-time API uptime.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Internet Data Bundles</h2>
            <p className="text-muted-foreground leading-relaxed">
              Data packages (including Faiba 4G packages, Safaricom Super/Okoa data bundles, and Airtel bundles) are credited directly to the target line. Package validity, data allowance volumes, and expiry rules follow each carrier&apos;s published service specifications.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Provider Pricing & Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              All package prices and fees are transparently displayed on checkout prior to payment prompt generation. Bundle prices are subject to adjustments based on telco tariff changes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
