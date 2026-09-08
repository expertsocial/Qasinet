import React from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Clock } from "lucide-react";
import { ServiceStatus } from "@/lib/services/registry";

interface DetailedServiceCardProps {
  id?: string;
  title: string;
  description: string;
  logoSrc: string;
  href: string;
  ctaText: string;
  badge?: string;
  status?: ServiceStatus;
  comingSoonMessage?: string;
}

export function DetailedServiceCard({
  title,
  description,
  logoSrc,
  href,
  ctaText,
  badge = "Instant",
  status = "enabled",
  comingSoonMessage,
}: DetailedServiceCardProps) {
  const isComingSoon = status === "coming_soon";

  return (
    <div className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-sm transition-all duration-300",
      isComingSoon
        ? "border-border/40 bg-card/60 opacity-85"
        : "border-border/80 bg-card hover:shadow-xl hover:-translate-y-1 hover:border-primary/50"
    )}>
      {!isComingSoon && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border/50 p-2 border border-slate-100 dark:border-slate-800 transition-transform duration-300",
            !isComingSoon && "group-hover:scale-105",
            isComingSoon && "grayscale-[30%]"
          )}>
            <Image
              src={logoSrc}
              alt={`${title} logo`}
              width={56}
              height={56}
              className="h-full w-full object-contain"
            />
          </div>

          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border",
            isComingSoon
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : "bg-primary/10 text-primary border-primary/20"
          )}>
            {isComingSoon ? "Coming Soon" : badge}
          </span>
        </div>
        
        <h3 className={cn(
          "mb-2 text-lg font-bold tracking-tight transition-colors",
          isComingSoon ? "text-foreground/80" : "text-foreground group-hover:text-primary"
        )}>
          {title}
        </h3>
        <p className="mb-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {isComingSoon && comingSoonMessage ? comingSoonMessage : description}
        </p>
      </div>

      <div className="relative z-10 mt-auto pt-4 border-t border-border/60">
        {isComingSoon ? (
          <div className="flex items-center justify-center gap-2 h-10 px-4 rounded-2xl bg-secondary/50 text-muted-foreground font-semibold text-xs border border-border/40 cursor-default">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Available Soon</span>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
