import { ServiceGrid } from "@/components/services/ServiceGrid";
import { buttonVariants } from "@/components/ui/Button";
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Smartphone, 
  Wifi, 
  Tv, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  Search,
  Layers,
  ArrowUpRight
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FaqSection } from "@/components/home/FaqSection";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-20 lg:pt-16 lg:pb-28">
        
        {/* Subtle Ambient Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/15 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            
            {/* Live Uptime Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/80 border border-border/80 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground">
                All Networks Operational • Instant M-Pesa Vending
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
              Instant Utilities & Airtime. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500">
                Delivered in Seconds.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
              Buy airtime, subscribe to data bundles, purchase KPLC electricity tokens, and settle TV & water bills seamlessly with automated M-Pesa checkout.
            </p>
            
            {/* Quick Service Action Launcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4">
              <Link 
                href="/services/airtime" 
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-bold text-foreground group"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span>Airtime</span>
              </Link>

              <Link 
                href="/services/data" 
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-bold text-foreground group"
              >
                <div className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <Wifi className="w-4 h-4" />
                </div>
                <span>Data</span>
              </Link>

              <Link 
                href="/services/electricity" 
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-bold text-foreground group"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Zap className="w-4 h-4" />
                </div>
                <span>Tokens</span>
              </Link>

              <Link 
                href="/services/tv" 
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-bold text-foreground group"
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Tv className="w-4 h-4" />
                </div>
                <span>TV Pay</span>
              </Link>
            </div>

            {/* Track Button */}
            <div className="pt-2">
              <Link 
                href="/track" 
                className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-muted"
              >
                <Search className="w-3.5 h-3.5" /> Have a receipt or reference? Track status here →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="py-16 sm:py-20 bg-muted/20 border-y border-border/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Direct Services Marketplace
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              What would you like to purchase?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Select your service below. Automatic account detection and instant vending enabled.
            </p>
          </div>
          
          <ServiceGrid />
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Value Pillars / Trust Highlights */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-14 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Engineered For Performance</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Why Kenyans choose QasiNet
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            
            <div className="p-7 rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sub-5-Second Vending</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Direct integration with telco gateways and KPLC systems ensures your tokens and airtime land immediately upon payment.
              </p>
            </div>
            
            <div className="p-7 rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Transparent Pricing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No hidden charges or surprise deductions. What you see on screen is the exact amount charged to your M-Pesa.
              </p>
            </div>
            
            <div className="p-7 rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Live Audit & Receipts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate downloadable PDF receipts, copy electricity tokens with one click, and track transactions at any time.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <FaqSection />

      {/* Supported Brands Bar */}
      <section className="py-14 border-t border-border/60 bg-muted/10">
        <div className="container mx-auto px-4 text-center space-y-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Supported Networks & Certified Utility Providers
          </p>
          
          <div className="flex gap-6 sm:gap-10 items-center justify-center flex-wrap opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
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
        </div>
      </section>

    </div>
  );
}
