import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card border-t border-border pt-16 pb-8 mt-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8 overflow-hidden rounded-lg">
                <Image
                  src="/logos/Qasinet logo.jpeg"
                  alt="QasiNet Logo"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">
                Qasi<span className="text-primary">Net</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Your premium digital services marketplace. Buy airtime, data, and pay utility bills instantly with guaranteed reliability.
            </p>
            <div className="flex items-center gap-2 mt-2 text-primary font-medium text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>Secure & Encrypted Payments</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-foreground">Services</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/services/airtime" className="text-sm text-muted-foreground hover:text-primary transition-colors">Buy Airtime</Link>
              <Link href="/services/data" className="text-sm text-muted-foreground hover:text-primary transition-colors">Internet Data</Link>
              <Link href="/services/tv" className="text-sm text-muted-foreground hover:text-primary transition-colors">TV Subscriptions</Link>
              <Link href="/services/electricity" className="text-sm text-muted-foreground hover:text-primary transition-colors">Electricity Tokens</Link>
              <Link href="/services/water" className="text-sm text-muted-foreground hover:text-primary transition-colors">Water Bills</Link>
            </nav>
          </div>

          {/* Customer Support */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-foreground">Support</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Track Transaction</Link>
              <Link href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</Link>
              <Link href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
              <Link href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-foreground">Legal</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/refunds" className="text-sm text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link>
              <Link href="/service-terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Service Terms</Link>
              <Link href="/payment-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Payment Policy</Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-foreground">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a href="mailto:qasinetltd@gmail.com" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <span>qasinetltd@gmail.com</span>
              </a>
              <a href="tel:+254116209855" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-foreground">
                  <Phone className="w-4 h-4" />
                </div>
                <span>+254 116 209 855</span>
              </a>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-foreground">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Nairobi, Kenya</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} QasiNet. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Powered by Kyanda</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
