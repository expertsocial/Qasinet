import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Mail, Phone, MapPin, Zap, Lock, Heart, CheckCircle2 } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card border-t border-border/80 pt-16 pb-8 mt-20 transition-colors">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-14">
          
          {/* Brand Column (2 cols wide on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 overflow-hidden rounded-xl border border-border/60 shadow-sm">
                <Image
                  src="/logos/qasinet-logo.jpeg"
                  alt="QasiNet Logo"
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-foreground">
                Qasi<span className="text-primary">Net</span>
              </span>
            </Link>
            
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Kenya’s premier digital services platform. Buy airtime, high-speed data bundles, KPLC electricity tokens, and settle TV & utility bills instantly with guaranteed automated delivery.
            </p>

            <div className="flex flex-col gap-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>256-Bit SSL Encrypted & Safaricom Daraja Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Direct Telco Gateway Integration • 99.98% Vending Uptime</span>
              </div>
            </div>
          </div>

          {/* Direct Services */}
          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-xs uppercase tracking-widest text-foreground">
              Services
            </h4>
            <nav className="flex flex-col gap-2.5 text-sm">
              <Link href="/services/airtime" className="text-muted-foreground hover:text-primary transition-colors">
                Airtime Top-Up
              </Link>
              <Link href="/services/data" className="text-muted-foreground hover:text-primary transition-colors">
                Internet Data Bundles
              </Link>
              <Link href="/services/electricity" className="text-muted-foreground hover:text-primary transition-colors">
                KPLC Electricity Tokens
              </Link>
              <Link href="/services/tv" className="text-muted-foreground hover:text-primary transition-colors">
                DStv & GOtv Subscriptions
              </Link>
              <Link href="/services/water" className="text-muted-foreground hover:text-primary transition-colors">
                Nairobi Water Utility
              </Link>
            </nav>
          </div>

          {/* Support & Account */}
          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-xs uppercase tracking-widest text-foreground">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-2.5 text-sm">
              <Link href="/track" className="text-muted-foreground hover:text-primary transition-colors">
                Track Transaction Status
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                User Dashboard
              </Link>
              <Link href="/support" className="text-muted-foreground hover:text-primary transition-colors">
                Help Center & FAQs
              </Link>
              <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact Support Team
              </Link>
              <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About QasiNet
              </Link>
            </nav>
          </div>

          {/* Legal & Contacts */}
          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-xs uppercase tracking-widest text-foreground">
              Contact & Legal
            </h4>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <a href="mailto:qasinetltd@gmail.com" className="hover:text-primary transition-colors flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="truncate">qasinetltd@gmail.com</span>
              </a>
              <a href="tel:+254116209855" className="hover:text-primary transition-colors flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>+254 116 209 855</span>
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <Link href="/terms" className="hover:underline">Terms</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <span>•</span>
              <Link href="/refunds" className="hover:underline">Refunds</Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border/80 gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {currentYear} QasiNet Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" /> Powered by Safaricom & Kyanda Gateway
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
