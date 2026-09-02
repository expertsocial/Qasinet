import React from "react";
import { Metadata } from "next";
import { ShieldCheck, Zap, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | QasiNet",
  description: "Learn about QasiNet, Kenya's premium digital-services marketplace.",
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
            QasiNet is a premium Kenyan digital-services marketplace. We provide a single, unified platform where customers can easily purchase airtime, data bundles, TV subscriptions, and pay utility bills.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-6">Our Purpose</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Our mission is to simplify the way you pay for essential services. Through QasiNet, you can purchase Safaricom, Airtel, Telkom, Equitel, and Faiba airtime or data bundles. 
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We also support major TV networks including DStv, GOtv, Zuku, and StarTimes, alongside essential utilities like Kenya Power (KPLC) and Nairobi Water. Our robust infrastructure automatically processes your transactions for a seamless, instant vending experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
              <Zap className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Instant Vending</h3>
              <p className="text-sm text-muted-foreground">Receive your tokens and top-ups immediately after payment confirmation.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center">
              <ShieldCheck className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">We verify all payments before vending to ensure your funds are protected.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center sm:col-span-2">
              <Globe className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Service First</h3>
              <p className="text-sm text-muted-foreground">No mandatory registrations. Experience ultimate convenience by buying exactly what you need as a guest.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
