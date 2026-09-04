import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ServiceCardProps {
  title: string;
  category: string;
  logoSrc: string;
  badge?: string;
  tagline?: string;
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
  onClick,
  className,
  delay = 0,
}: ServiceCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group cursor-pointer relative overflow-hidden rounded-3xl",
        "bg-card/90 hover:bg-card border border-border/80 hover:border-primary/50",
        "p-5 sm:p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5",
        "flex flex-col justify-between min-h-[170px] sm:min-h-[190px]",
        className
      )}
    >
      {/* Subtle hover gradient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Card Header: Logo + Badge + Arrow */}
      <div className="flex items-start justify-between w-full gap-2">
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform duration-300">
          <Image
            src={logoSrc}
            alt={title}
            fill
            className="object-contain p-1.5"
            sizes="56px"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wide">
            {badge}
          </span>
          <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Card Body: Title & Category */}
      <div className="pt-4 space-y-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          {category}
        </p>
        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors leading-tight">
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
