'use client';

import React, { useState, useMemo } from 'react';
import { savePricingAction } from './actions';
import { Save, AlertCircle, Percent, DollarSign, Calculator, Sparkles, Check, ArrowUpRight, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PricingFormClient({ service, products, pricingRecords }: any) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find pricing for currently selected entity (service globally, or specific product)
  const currentPricing = useMemo(() => {
    return pricingRecords.find((p: any) => 
      selectedProduct ? p.product_id === selectedProduct : (p.service_id === service.id && !p.product_id)
    ) || {};
  }, [pricingRecords, selectedProduct, service.id]);

  // Form State for Live Profit Simulator
  const [providerCostPct, setProviderCostPct] = useState<number | string>(currentPricing.provider_cost_percentage ?? 95);
  const [providerCostFixed, setProviderCostFixed] = useState<number | string>(currentPricing.provider_cost_fixed ?? '');
  const [sellingPricePct, setSellingPricePct] = useState<number | string>(currentPricing.selling_price_percentage ?? 100);
  const [sellingPriceFixed, setSellingPriceFixed] = useState<number | string>(currentPricing.selling_price_fixed ?? '');
  const [simAmount, setSimAmount] = useState<number>(100);

  // When selected target changes, sync state
  React.useEffect(() => {
    setProviderCostPct(currentPricing.provider_cost_percentage ?? 95);
    setProviderCostFixed(currentPricing.provider_cost_fixed ?? '');
    setSellingPricePct(currentPricing.selling_price_percentage ?? 100);
    setSellingPriceFixed(currentPricing.selling_price_fixed ?? '');
  }, [currentPricing]);

  // Calculations for Simulator
  const simResults = useMemo(() => {
    const faceVal = Number(simAmount) || 0;
    
    // Provider Cost
    let cost = 0;
    if (providerCostPct !== '' && providerCostPct !== null) {
      cost = faceVal * (Number(providerCostPct) / 100);
    } else if (providerCostFixed !== '' && providerCostFixed !== null) {
      cost = Number(providerCostFixed);
    }

    // Customer Price
    let price = faceVal;
    if (sellingPricePct !== '' && sellingPricePct !== null) {
      price = faceVal * (Number(sellingPricePct) / 100);
    } else if (sellingPriceFixed !== '' && sellingPriceFixed !== null) {
      price = faceVal + Number(sellingPriceFixed);
    }

    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;

    return { faceVal, cost, price, profit, marginPct };
  }, [simAmount, providerCostPct, providerCostFixed, sellingPricePct, sellingPriceFixed]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await savePricingAction(service.id, selectedProduct, formData);
      toast.success('Pricing model updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pricing');
    } finally {
      setIsLoading(false);
    }
  }

  const applyPreset = (provPct: number, provFix: string, sellPct: number, sellFix: string) => {
    setProviderCostPct(provPct);
    setProviderCostFixed(provFix);
    setSellingPricePct(sellPct);
    setSellingPriceFixed(sellFix);
    toast.success('Preset applied! Click Save to apply.', { icon: '✨' });
  };

  const currentProductName = selectedProduct 
    ? products.find((p: any) => p.id === selectedProduct)?.name 
    : 'Global Service Default';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Configuration Target Selection */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            Target Selection
          </h3>
          
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                selectedProduct === null 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                  : 'bg-neutral-950/60 text-neutral-300 hover:bg-neutral-800/60 border border-neutral-800/50'
              }`}
            >
              <span>Global Service Default</span>
              {selectedProduct === null && <Check className="w-4 h-4 text-emerald-400" />}
            </button>

            {products.length > 0 && (
              <div className="pt-3 space-y-1.5 border-t border-neutral-800/60 mt-3">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-1">
                  Individual Products ({products.length})
                </div>
                {products.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProduct(p.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      selectedProduct === p.id 
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shadow-sm' 
                        : 'bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 border border-neutral-800/40'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {selectedProduct === p.id && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Profit Margin Simulator Card */}
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800/80 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              Live Profit Simulator
            </h4>
            <span className="text-[10px] font-mono text-neutral-400">Interactive</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Test Sample Amount:</span>
              <span className="font-bold text-white font-mono">KES {simAmount}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[20, 50, 100, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSimAmount(amt)}
                  className={`py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    simAmount === amt 
                      ? 'bg-emerald-500 text-neutral-950' 
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-neutral-400">
              <span>Customer Pays:</span>
              <span className="text-white font-bold">KES {simResults.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Kyanda Provider Cost:</span>
              <span className="text-neutral-300">KES {simResults.cost.toFixed(2)}</span>
            </div>
            <div className="h-px bg-neutral-800 my-1"></div>
            <div className="flex justify-between text-sm items-center">
              <span className="font-bold text-neutral-300">Your Net Margin:</span>
              <span className={`font-black ${simResults.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                KES {simResults.profit.toFixed(2)} ({simResults.marginPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Pricing Form Area */}
      <div className="lg:col-span-8">
        <form onSubmit={handleSubmit} className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-6 space-y-6 shadow-sm">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Active Pricing Target</p>
                <p className="text-sm font-bold text-white tracking-wide">{currentProductName}</p>
              </div>
            </div>
            
            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset(95, '', 100, '')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                title="Customer pays 100%, Kyanda charges 95% (5% profit)"
              >
                5% Margin
              </button>
              <button
                type="button"
                onClick={() => applyPreset(95, '', 100, '5')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                title="Customer pays 100% + KES 5 convenience fee"
              >
                +KES 5 Fee
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* 1. PROVIDER COSTS */}
            <div className="space-y-4 bg-neutral-950/40 p-5 rounded-xl border border-neutral-800/60">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Kyanda Provider Cost
                </h3>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Provider Cost Percentage (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    name="provider_cost_percentage"
                    value={providerCostPct}
                    onChange={(e) => setProviderCostPct(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-3.5 pr-8 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="e.g. 95.00"
                  />
                  <span className="absolute right-3.5 top-3 text-neutral-500 font-mono text-xs">%</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Percentage charged by Kyanda (e.g., 95% = KES 95 per 100 KES airtime).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Provider Fixed Cost (KES)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    name="provider_cost_fixed"
                    value={providerCostFixed}
                    onChange={(e) => setProviderCostFixed(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="e.g. 0.00"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Leave empty if using percentage.</p>
              </div>
            </div>

            {/* 2. CUSTOMER SELLING PRICE */}
            <div className="space-y-4 bg-neutral-950/40 p-5 rounded-xl border border-neutral-800/60">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Customer Selling Price
                </h3>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Selling Price Percentage (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    name="selling_price_percentage"
                    value={sellingPricePct}
                    onChange={(e) => setSellingPricePct(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-3.5 pr-8 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="e.g. 100.00"
                  />
                  <span className="absolute right-3.5 top-3 text-neutral-500 font-mono text-xs">%</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">100% means face value (KES 100 airtime costs KES 100).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Selling Fixed Convenience Fee (KES)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="selling_price_fixed"
                  value={sellingPriceFixed}
                  onChange={(e) => setSellingPriceFixed(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. 0.00 or 5.00"
                />
                <p className="text-[11px] text-neutral-500 mt-1">Extra fixed fee added on top (e.g. +KES 5 on utility tokens).</p>
              </div>
            </div>

          </div>

          {/* Active Switch */}
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-neutral-200">Enable Pricing Configuration</span>
              <p className="text-xs text-neutral-500 mt-0.5">When active, all checkout quotes will calculate with these margins.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="hidden" 
                name="is_active" 
                value="false" 
              />
              <input 
                type="checkbox" 
                name="is_active"
                value="true"
                defaultChecked={currentPricing.is_active ?? true}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-neutral-500 font-mono">
              Changes apply instantly to live checkout
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Pricing Model</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

