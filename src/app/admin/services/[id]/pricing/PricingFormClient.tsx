'use client';

import React, { useState, useMemo } from 'react';
import { savePricingAction, createProductAction, deleteProductAction } from './actions';
import { Save, AlertCircle, Percent, DollarSign, Calculator, Sparkles, Check, ArrowUpRight, Plus, Trash2, X, Package, Wifi } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PricingFormClient({ service, products: initialProducts, pricingRecords: initialPricing }: any) {
  const [products, setProducts] = useState(initialProducts || []);
  const [pricingRecords, setPricingRecords] = useState(initialPricing || []);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Sync state if props update
  React.useEffect(() => {
    setProducts(initialProducts || []);
    setPricingRecords(initialPricing || []);
  }, [initialProducts, initialPricing]);

  // Find pricing for currently selected entity (service globally, or specific product)
  const currentPricing = useMemo(() => {
    return pricingRecords.find((p: any) => 
      selectedProduct ? p.product_id === selectedProduct : (p.service_id === service.id && !p.product_id)
    ) || {};
  }, [pricingRecords, selectedProduct, service.id]);

  // Form State for Live Profit Simulator
  const [providerCostPct, setProviderCostPct] = useState<number | string>(currentPricing.provider_cost_percentage ?? '');
  const [providerCostFixed, setProviderCostFixed] = useState<number | string>(currentPricing.provider_cost_fixed ?? '');
  const [sellingPricePct, setSellingPricePct] = useState<number | string>(currentPricing.selling_price_percentage ?? '');
  const [sellingPriceFixed, setSellingPriceFixed] = useState<number | string>(currentPricing.selling_price_fixed ?? '');
  const [simAmount, setSimAmount] = useState<number>(selectedProduct ? (Number(currentPricing.selling_price_fixed) || 100) : 100);

  // When selected target changes, sync state
  React.useEffect(() => {
    setProviderCostPct(currentPricing.provider_cost_percentage ?? (selectedProduct ? '' : 95));
    setProviderCostFixed(currentPricing.provider_cost_fixed ?? '');
    setSellingPricePct(currentPricing.selling_price_percentage ?? (selectedProduct ? '' : 100));
    setSellingPriceFixed(currentPricing.selling_price_fixed ?? '');
    if (selectedProduct && currentPricing.selling_price_fixed) {
      setSimAmount(Number(currentPricing.selling_price_fixed));
    }
  }, [currentPricing, selectedProduct]);

  // Calculations for Simulator
  const simResults = useMemo(() => {
    const faceVal = Number(simAmount) || 0;
    
    // Provider Cost
    let cost = 0;
    if (providerCostFixed !== '' && providerCostFixed !== null) {
      cost = Number(providerCostFixed);
    } else if (providerCostPct !== '' && providerCostPct !== null) {
      cost = faceVal * (Number(providerCostPct) / 100);
    }

    // Customer Price
    let price = faceVal;
    if (sellingPriceFixed !== '' && sellingPriceFixed !== null) {
      price = Number(sellingPriceFixed);
    } else if (sellingPricePct !== '' && sellingPricePct !== null) {
      price = faceVal * (Number(sellingPricePct) / 100);
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
      
      // Update local pricing state
      const updatedFixedPrice = formData.get('selling_price_fixed') !== '' ? Number(formData.get('selling_price_fixed')) : null;
      const updatedFixedCost = formData.get('provider_cost_fixed') !== '' ? Number(formData.get('provider_cost_fixed')) : null;
      const updatedPctPrice = formData.get('selling_price_percentage') !== '' ? Number(formData.get('selling_price_percentage')) : null;
      const updatedPctCost = formData.get('provider_cost_percentage') !== '' ? Number(formData.get('provider_cost_percentage')) : null;
      const updatedActive = formData.get('is_active') === 'true';

      setPricingRecords((prev: any[]) => {
        const idx = prev.findIndex((p: any) => selectedProduct ? p.product_id === selectedProduct : (p.service_id === service.id && !p.product_id));
        const newRecord = {
          service_id: selectedProduct ? null : service.id,
          product_id: selectedProduct,
          selling_price_fixed: updatedFixedPrice,
          provider_cost_fixed: updatedFixedCost,
          selling_price_percentage: updatedPctPrice,
          provider_cost_percentage: updatedPctCost,
          is_active: updatedActive
        };
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...newRecord };
          return updated;
        }
        return [...prev, newRecord];
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pricing');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await createProductAction(service.id, formData);
      toast.success(`Bundle "${res.product.name}" created!`);
      setShowAddModal(false);
      
      const newProduct = res.product;
      setProducts((prev: any[]) => [...prev, newProduct]);
      setSelectedProduct(newProduct.id);

      const fixedPrice = formData.get('selling_price_fixed') !== '' ? Number(formData.get('selling_price_fixed')) : null;
      const fixedCost = formData.get('provider_cost_fixed') !== '' ? Number(formData.get('provider_cost_fixed')) : null;

      if (fixedPrice !== null || fixedCost !== null) {
        setPricingRecords((prev: any[]) => [
          ...prev,
          {
            product_id: newProduct.id,
            selling_price_fixed: fixedPrice,
            provider_cost_fixed: fixedCost,
            selling_price_percentage: 100,
            is_active: true
          }
        ]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;

    setIsDeleting(productId);
    try {
      await deleteProductAction(service.id, productId);
      toast.success(`Bundle "${productName}" removed.`);
      setProducts((prev: any[]) => prev.filter((p: any) => p.id !== productId));
      if (selectedProduct === productId) {
        setSelectedProduct(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
    } finally {
      setIsDeleting(null);
    }
  }

  const applyPreset = (provPct: any, provFix: any, sellPct: any, sellFix: any) => {
    setProviderCostPct(provPct);
    setProviderCostFixed(provFix);
    setSellingPricePct(sellPct);
    setSellingPriceFixed(sellFix);
    toast.success('Preset applied! Click Save to apply.', { icon: '✨' });
  };

  const currentProductName = selectedProduct 
    ? products.find((p: any) => p.id === selectedProduct)?.name 
    : 'Global Service Default';

  const isDataService = service.type === 'data' || service.slug.includes('data');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Configuration Target Selection */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-primary" />
              Target Selection
            </h3>
            
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20"
            >
              <Plus className="w-3 h-3" /> Add Bundle
            </button>
          </div>
          
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
              <div className="pt-3 space-y-1.5 border-t border-neutral-800/60 mt-3 max-h-[380px] overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-1 flex justify-between items-center">
                  <span>Packages & Bundles ({products.length})</span>
                </div>
                {products.map((p: any) => {
                  const prRecord = pricingRecords.find((r: any) => r.product_id === p.id);
                  const price = prRecord?.selling_price_fixed ?? prRecord?.selling_price_percentage;
                  
                  return (
                    <div
                      key={p.id}
                      className={`w-full group px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                        selectedProduct === p.id 
                          ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shadow-sm' 
                          : 'bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 border border-neutral-800/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(p.id)}
                        className="flex-1 text-left truncate flex items-center justify-between"
                      >
                        <span className="truncate">{p.name}</span>
                        {price !== undefined && price !== null && (
                          <span className="ml-2 font-mono text-[11px] text-emerald-400 font-bold shrink-0">
                            KES {price}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(p.id, p.name);
                        }}
                        disabled={isDeleting === p.id}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 text-neutral-500 transition-opacity shrink-0"
                        title="Delete this bundle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
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
              <span>Customer Face Value:</span>
              <span className="font-bold text-white font-mono">KES {simAmount}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 500, 1000].map((amt) => (
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
              <span>Customer Price:</span>
              <span className="text-white font-bold">KES {simResults.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Kyanda Provider Cost:</span>
              <span className="text-neutral-300">KES {simResults.cost.toFixed(2)}</span>
            </div>
            <div className="h-px bg-neutral-800 my-1"></div>
            <div className="flex justify-between text-sm items-center">
              <span className="font-bold text-neutral-300">Your Net Profit:</span>
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
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedProduct ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const cost = Number(providerCostFixed) || 100;
                      setSellingPriceFixed(cost + 20);
                      toast.success('Selling price set to Cost + KES 20 profit!');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    +KES 20 Margin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cost = Number(providerCostFixed) || 100;
                      setSellingPriceFixed(cost + 50);
                      toast.success('Selling price set to Cost + KES 50 profit!');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    +KES 50 Margin
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
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
                    placeholder="e.g. 480.00"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Amount Kyanda deducts for vending this bundle.</p>
              </div>

              {!selectedProduct && (
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
                  <p className="text-[11px] text-neutral-500 mt-1">Used for airtime percentage (e.g. 95%).</p>
                </div>
              )}
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
                  Selling Price (KES)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="selling_price_fixed"
                  value={sellingPriceFixed}
                  onChange={(e) => {
                    setSellingPriceFixed(e.target.value);
                    if (e.target.value) setSimAmount(Number(e.target.value));
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors font-bold text-emerald-400"
                  placeholder="e.g. 500.00"
                />
                <p className="text-[11px] text-neutral-500 mt-1">Retail amount customer is charged on checkout.</p>
              </div>

              {!selectedProduct && (
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
                  <p className="text-[11px] text-neutral-500 mt-1">100% means standard face value.</p>
                </div>
              )}
            </div>

          </div>

          {/* Active Switch */}
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-neutral-200">Enable Pricing Configuration</span>
              <p className="text-xs text-neutral-500 mt-0.5">When active, customer checkout will calculate with these exact figures.</p>
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
              Live instant pricing synchronization
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

      {/* Modal to Add New Data Bundle / Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Bundle / Package</h3>
                  <p className="text-xs text-neutral-400">For {service.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Bundle Name & Description *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Weekly 5GB (7 Days) or Bamba 2GB"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-[11px] text-neutral-500 mt-1">Include allowance (e.g. 5GB) and validity (e.g. 7 Days).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Kyanda Cost (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="provider_cost_fixed"
                    required
                    placeholder="e.g. 450"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Selling Price (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_price_fixed"
                    required
                    placeholder="e.g. 500"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Provider Product Code (Optional)
                </label>
                <input
                  type="text"
                  name="provider_product_id"
                  placeholder="e.g. BUNDLE_AIRTEL_5GB"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors text-neutral-400"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20 transition-all"
                >
                  {isLoading ? 'Creating...' : 'Create & Price Bundle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


