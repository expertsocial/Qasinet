import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Zap, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about QasiNet, Kenya's trusted platform for instant airtime top-ups and high-speed data bundles across Safaricom, Airtel, Telkom, Equitel, and Faiba 4G.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Us | QasiNet",
    description: "Learn about QasiNet, Kenya's trusted platform for instant airtime top-ups and high-speed data bundles across Safaricom, Airtel, Telkom, Equitel, and Faiba 4G.",
  },
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Hero Section */}
      <section className="bg-secondary/30 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            About QasiNet
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            QasiNet is Kenya&apos;s modern, high-speed digital services platform. We provide a single, unified gateway where Kenyans can easily purchase instant airtime and mobile data bundles across all major telecommunications networks.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-6">Our Purpose</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Our mission is to simplify how Kenyans stay connected. Through QasiNet, you can purchase{" "}
              <Link href="/services/airtime" className="text-primary font-medium hover:underline">
                Safaricom, Airtel, Telkom, Equitel, and Faiba airtime
              </Link>{" "}
              with zero extra hassle and real-time M-Pesa fulfillment.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              We also vend premier{" "}
              <Link href="/services/data" className="text-primary font-medium hover:underline">
                Internet Data Bundles
              </Link>
              , including Faiba 4G unlimited/monthly packages and high-discount Bingwa Sokoni Safaricom and Airtel bundles. Our direct carrier integrations automatically vend your order within seconds of M-Pesa confirmation.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/services/airtime"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Top up Airtime <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/services/data"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Browse Data Bundles <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
              <Zap className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Instant Vending</h3>
              <p className="text-sm text-muted-foreground">Receive your airtime recharge and data allowances immediately after M-Pesa confirmation.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
              <ShieldCheck className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">Direct Daraja M-Pesa STK Push verification ensures your transactions are completely protected.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center sm:col-span-2">
              <Globe className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Guest Checkout</h3>
              <p className="text-sm text-muted-foreground">No mandatory account creation. Enjoy fast, friction-free transactions by ordering as a guest anytime.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
