import { ServiceGrid } from "@/components/services/ServiceGrid";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, ShieldCheck, Zap, Clock, Smartphone, Wifi, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FaqSection } from "@/components/home/FaqSection";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Background Gradients */}
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Your Digital Services. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                One Simple Platform.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the ultimate convenience. Buy airtime, top up your data, or pay your TV and electricity bills instantly through QasiNet.
            </p>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/services/airtime" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto gap-2")}>
                <Smartphone className="w-4 h-4" /> Buy Airtime
              </Link>
              <Link href="/services/data" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto gap-2")}>
                <Wifi className="w-4 h-4" /> Buy Data
              </Link>
              <Link href="/services/tv" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto gap-2")}>
                <Tv className="w-4 h-4" /> Pay TV
              </Link>
              <Link href="/services/electricity" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto gap-2")}>
                <Zap className="w-4 h-4" /> Pay Electricity
              </Link>
              
              <Link href="/track" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto mt-2 sm:mt-0")}>
                Track Transaction
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="py-16 bg-accent/50 border-y border-border">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">What would you like to do?</h2>
            <p className="text-muted-foreground">Select a service below to begin your transaction instantly.</p>
          </div>
          
          <ServiceGrid />
        </div>
      </section>

      <HowItWorks />

      {/* Why QasiNet Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why choose QasiNet?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide a seamless experience for all your digital needs, backed by enterprise-grade security.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl glass-panel">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Fast Processing</h3>
              <p className="text-muted-foreground">
                Your services are delivered instantly upon payment confirmation. No waiting, no delays.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl glass-panel">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Secure Payments</h3>
              <p className="text-muted-foreground">
                All transactions are encrypted and securely processed. We maintain transparent pricing at all times.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl glass-panel">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Track Transactions</h3>
              <p className="text-muted-foreground">
                Monitor the status of your purchase at any time with our robust transaction tracking system.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />

      {/* Supported Networks Marquee */}
      <section className="py-12 border-t border-border overflow-hidden bg-background">
        <div className="container mx-auto px-4 text-center mb-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Supporting all major Kenyan networks & services
          </p>
        </div>
        
        <div className="flex gap-8 items-center justify-center flex-wrap opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="w-24 h-12 relative">
            <Image src="/logos/safaricom-logo.png" alt="Safaricom" fill className="object-contain" sizes="96px" />
          </div>
          <div className="w-24 h-12 relative">
            <Image src="/logos/airtel-logo.jpg" alt="Airtel" fill className="object-contain" sizes="96px" />
          </div>
          <div className="w-24 h-12 relative">
            <Image src="/logos/telcom-logo.png" alt="Telkom" fill className="object-contain" sizes="96px" />
          </div>
          <div className="w-24 h-12 relative">
            <Image src="/logos/kenya-power-logo.jpg" alt="KPLC" fill className="object-contain" sizes="96px" />
          </div>
          <div className="w-24 h-12 relative">
            <Image src="/logos/dstv-logo.jpg" alt="DStv" fill className="object-contain" sizes="96px" />
          </div>
          <div className="w-24 h-12 relative">
            <Image src="/logos/gotv-logo.png" alt="GOtv" fill className="object-contain" sizes="96px" />
          </div>
        </div>
      </section>
    </div>
  );
}
