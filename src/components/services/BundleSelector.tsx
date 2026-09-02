import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface DataBundle {
  id: string;
  name: string;
  allowance: string;
  validity: string;
  price: number;
  category: "Daily" | "Weekly" | "Monthly" | "Special";
}

interface BundleSelectorProps {
  bundles: DataBundle[];
  selectedBundleId: string | null;
  onSelect: (bundle: DataBundle) => void;
  className?: string;
}

export function BundleSelector({ bundles, selectedBundleId, onSelect, className }: BundleSelectorProps) {
  const [activeTab, setActiveTab] = useState<DataBundle["category"]>("Daily");

  // Get unique categories available in the current bundles
  const categories = Array.from(new Set(bundles.map(b => b.category)));
  
  // Filter bundles by active tab
  const visibleBundles = bundles.filter(b => b.category === activeTab);

  return (
    <div className={cn("space-y-6", className)}>
      <label className="text-sm font-medium text-foreground">Select Data Bundle</label>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveTab(cat)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border",
              activeTab === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/50 hover:bg-secondary/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bundles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleBundles.length === 0 ? (
          <p className="text-muted-foreground text-sm col-span-full">No bundles available in this category.</p>
        ) : (
          visibleBundles.map((bundle) => {
            const isSelected = selectedBundleId === bundle.id;

            return (
              <button
                key={bundle.id}
                type="button"
                onClick={() => onSelect(bundle)}
                className={cn(
                  "relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 overflow-hidden",
                  "hover:border-primary/50 hover:shadow-md",
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" 
                    : "border-border/50 bg-card"
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-bl-xl">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-lg pr-6">{bundle.name}</h4>
                </div>
                
                <div className="space-y-1 mb-6 flex-1">
                  <p className="text-2xl font-bold text-primary">{bundle.allowance}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{bundle.validity}</p>
                </div>

                <div className="pt-4 border-t border-border/50 w-full flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-bold text-lg">KES {bundle.price}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
