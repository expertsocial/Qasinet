import React from "react";
import { DetailedServiceCard } from "@/components/services/DetailedServiceCard";
import { Metadata } from "next";
import { Smartphone, Zap, Sparkles } from "lucide-react";
import { getGroupedServices } from "@/lib/services/registry";

export const metadata: Metadata = {
  title: "Services Directory | QasiNet",
  description: "Browse our complete catalog of certified airtime, high-speed data bundles, KPLC electricity tokens, and TV & utility payments.",
};

export default function ServicesDirectoryPage() {
  const serviceGroups = getGroupedServices();

  return (
    <div className="flex flex-col min-h-screen pt-12 pb-20">
      {/* Header Banner */}
      <section className="py-12 sm:py-16 text-center max-w-3xl mx-auto px-4 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> All-In-One Utilities Portal
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
          Digital Services Directory
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Explore our complete catalogue of certified telecom, power, and entertainment payment gateways. Automated M-Pesa delivery guaranteed.
        </p>
      </section>

      {/* Grouped Service Catalog */}
      <div className="container mx-auto px-4 md:px-6 space-y-16 max-w-7xl">
        {serviceGroups.map((group) => {
          const GroupIcon = group.iconName === "Smartphone" ? Smartphone : Zap;
          const iconColor = group.key === "airtime_data" 
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
            : "bg-amber-500/10 text-amber-500 border border-amber-500/20";

          return (
            <div key={group.key} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${iconColor}`}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                      {group.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {group.tagline}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full w-fit">
                  {group.services.length} services
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {group.services.map((service) => (
                  <DetailedServiceCard 
                    key={service.id}
                    id={service.id}
                    title={service.title}
                    description={service.description}
                    logoSrc={service.logoSrc}
                    href={service.href}
                    ctaText={
                      service.category === 'airtime' ? `Buy ${service.shortName}` :
                      service.category === 'data' ? `Browse ${service.shortName}` :
                      service.category === 'electricity' ? `Vend ${service.shortName}` :
                      `Pay ${service.shortName}`
                    }
                    badge={service.badge}
                    status={service.status}
                    comingSoonMessage={service.comingSoonMessage}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
