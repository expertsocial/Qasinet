"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceCard } from "./ServiceCard";
import { 
  Smartphone, 
  Wifi, 
  Zap, 
  Tv, 
  Droplets, 
  LayoutGrid, 
  Layers,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getVisibleServices, 
  getGroupedServices, 
  ServiceDefinition, 
  ServiceStatus 
} from "@/lib/services/registry";

const CATEGORIES = [
  { id: "all", label: "All Services", icon: LayoutGrid },
  { id: "airtime", label: "Airtime", icon: Smartphone },
  { id: "data", label: "Data Bundles", icon: Wifi },
  { id: "electricity", label: "Electricity", icon: Zap },
  { id: "tv", label: "TV Subscriptions", icon: Tv },
  { id: "water", label: "Water", icon: Droplets },
];

export function ServiceGrid() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const visibleServices = getVisibleServices();
  const serviceGroups = getGroupedServices();

  const handleServiceClick = (category: string, serviceId: string, status: ServiceStatus) => {
    if (status === "coming_soon") return; // Handled by card toast
    router.push(`/services/${category}?provider=${serviceId}`);
  };

  const filteredServices = selectedCategory === "all"
    ? visibleServices
    : visibleServices.filter((s) => s.category === selectedCategory);

  return (
    <div className="w-full space-y-10">
      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/80"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grouped Layout when "All Services" is selected */}
      {selectedCategory === "all" ? (
        <div className="space-y-12">
          {serviceGroups.map((group, groupIdx) => {
            const GroupIcon = group.iconName === "Smartphone" ? Smartphone : Zap;
            return (
              <div key={group.key} className="space-y-5">
                {/* Section Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs shadow-sm",
                      group.key === "airtime_data" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    )}>
                      <GroupIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                        {group.title}
                      </h3>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {group.tagline}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-full w-fit">
                    {group.services.length} services available
                  </span>
                </div>

                {/* Grid for this Group */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {group.services.map((service, index) => (
                    <ServiceCard
                      key={service.id}
                      title={service.title}
                      category={service.categoryLabel}
                      logoSrc={service.logoSrc}
                      badge={service.badge}
                      tagline={service.tagline}
                      status={service.status}
                      comingSoonMessage={service.comingSoonMessage}
                      delay={(groupIdx * 4 + index) * 25}
                      onClick={() => handleServiceClick(service.category, service.id, service.status)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Filtered Category Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground">
              Showing {filteredServices.length} {selectedCategory} services
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredServices.map((service, index) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                category={service.categoryLabel}
                logoSrc={service.logoSrc}
                badge={service.badge}
                tagline={service.tagline}
                status={service.status}
                comingSoonMessage={service.comingSoonMessage}
                delay={index * 25}
                onClick={() => handleServiceClick(service.category, service.id, service.status)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
