import React from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Zap } from "lucide-react";

interface DetailedServiceCardProps {
  id: string;
  title: string;
  description: string;
  logoSrc: string;
  href: string;
  ctaText: string;
  badge?: string;
}

export function DetailedServiceCard({
  title,
  description,
  logoSrc,
  href,
  ctaText,
  badge = "Instant",
}: DetailedServiceCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border/50 p-2 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform duration-300">
            <Image
              src={logoSrc}
              alt={`${title} logo`}
              width={56}
              height={56}
              className="h-full w-full object-contain"
            />
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wider uppercase">
            {badge}
          </span>
        </div>
        
        <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mb-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="relative z-10 mt-auto pt-4 border-t border-border/60">
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full rounded-2xl font-bold text-xs h-10 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary gap-1.5 transition-all shadow-sm"
          )}
        >
          <span>{ctaText}</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
