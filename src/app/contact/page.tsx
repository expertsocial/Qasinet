"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Phone, MapPin, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Header */}
      <section className="bg-secondary/30 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Contact Support
          </h1>
          <p className="text-lg text-muted-foreground">
            Our team is here to help. Whether you have a question about a transaction or need assistance with a service, reach out to us.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
          
          {/* Contact Info & FAQ Shortcut */}
          <div className="lg:col-span-5 space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    <p className="text-muted-foreground"><a href="mailto:qasinetltd@gmail.com" className="hover:text-primary transition-colors">qasinetltd@gmail.com</a></p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Phone</h3>
                    <p className="text-muted-foreground"><a href="tel:+254116209855" className="hover:text-primary transition-colors">+254 116 209 855</a></p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Office</h3>
                    <p className="text-muted-foreground">[QasiNet HQ, Nairobi, Kenya]</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-sm">
              <MessageSquare className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Have a quick question?</h3>
              <p className="text-muted-foreground mb-6">
                Check our Frequently Asked Questions section before reaching out. You might find your answer there.
              </p>
              <Link href="/#faq" className="text-primary font-medium hover:underline inline-flex items-center gap-2">
                Visit FAQ <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-8 md:p-10 rounded-3xl bg-card border border-border/50 shadow-lg">
              <h2 className="text-2xl font-bold mb-8">Send us a Message</h2>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                    <Input id="name" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Support Category</label>
                  <select 
                    id="category" 
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="transaction">Transaction Issue (Pending/Failed)</option>
                    <option value="billing">Billing & Refunds</option>
                    <option value="account">Account Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tx-ref" className="text-sm font-medium">Transaction Reference <span className="text-muted-foreground font-normal">(Optional)</span></label>
                  <Input id="tx-ref" placeholder="e.g., QSN-20260902-000001" />
                  <p className="text-xs text-muted-foreground">If your inquiry is about a specific purchase, please provide the reference number.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <textarea 
                    id="message" 
                    rows={5}
                    className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Describe your issue or question in detail..."
                  />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Send Message
                </Button>
              </form>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
