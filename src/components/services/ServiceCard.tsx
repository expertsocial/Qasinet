"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Clock } from "lucide-react";
import { ServiceStatus } from "@/lib/services/registry";
import toast from "react-hot-toast";

interface ServiceCardProps {
  title: string;
  category: string;
  logoSrc: string;
  badge?: string;
  tagline?: string;
  status?: ServiceStatus;
  comingSoonMessage?: string;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export function ServiceCard({
  title,
  category,
  logoSrc,
  badge = "Instant",
  tagline,
  status = "enabled",
  comingSoonMessage,
  onClick,
  className,
  delay = 0,
}: ServiceCardProps) {
  const isComingSoon = status === "coming_soon";

  const handleClick = () => {
    if (isComingSoon) {
      toast(
        comingSoonMessage || `${title} is launching soon! Our team is finalizing provider connectivity.`,
        {
          icon: "⏳",
          style: {
            borderRadius: "16px",
            background: "#18181b",
            color: "#f4f4f5",
            border: "1px solid #27272a",
            fontSize: "13px",
          },
        }
      );
      return;
    }
    onClick?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-sm flex flex-col justify-between min-h-[170px] sm:min-h-[190px]",
        isComingSoon
          ? "bg-card/60 border border-border/40 hover:border-amber-500/40 opacity-80 cursor-default"
          : "cursor-pointer bg-card/90 hover:bg-card border border-border/80 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1.5",
        className
      )}
    >
      {/* Subtle hover gradient glow */}
      {!isComingSoon && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      
      {/* Card Header: Logo + Badge + Arrow */}
      <div className="flex items-start justify-between w-full gap-2">
        <div className={cn(
          "relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 border border-slate-100 dark:border-slate-800 transition-transform duration-300",
          !isComingSoon && "group-hover:scale-105",
          isComingSoon && "grayscale-[30%]"
        )}>
          <Image
            src={logoSrc}
            alt={title}
            fill
            className="object-contain p-1.5"
            sizes="56px"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full tracking-wide border",
            isComingSoon
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : "bg-primary/10 text-primary border-primary/20"
          )}>
            {isComingSoon ? "Coming Soon" : badge}
          </span>
          
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
            isComingSoon
              ? "bg-secondary text-muted-foreground"
              : "bg-muted/60 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
          )}>
            {isComingSoon ? (
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </div>
        </div>
      </div>

      {/* Card Body: Title & Category */}
      <div className="pt-4 space-y-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          {category}
        </p>
        <h3 className={cn(
          "font-bold text-sm sm:text-base transition-colors leading-tight",
          isComingSoon ? "text-foreground/80" : "text-foreground group-hover:text-primary"
        )}>
          {title}
        </h3>
        {tagline && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
