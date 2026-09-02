'use client';

import { useState } from 'react';
import { savePricingAction } from './actions';
import { Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PricingFormClient({ service, products, pricingRecords }: any) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find pricing for currently selected entity (service globally, or specific product)
  const currentPricing = pricingRecords.find((p: any) => 
    selectedProduct ? p.product_id === selectedProduct : (p.service_id === service.id && !p.product_id)
  ) || {};

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await savePricingAction(service.id, selectedProduct, formData);
      toast.success('Pricing updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pricing');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar for Selection */}
      <div className="md:col-span-1 space-y-2">
        <h3 className="text-sm font-medium text-neutral-400 mb-4">Configuration Target</h3>
        
        <button
          onClick={() => setSelectedProduct(null)}
          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            selectedProduct === null 
              ? 'bg-blue-600 text-white' 
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          Global Service Default
        </button>

        {products.length > 0 && (
          <div className="pt-4 space-y-2">
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Products</h4>
            {products.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedProduct === p.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 border border-neutral-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form Area */}
      <div className="md:col-span-3">
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <AlertCircle size={20} />
            <p className="text-sm">
              You are configuring pricing for: <strong className="text-white">
                {selectedProduct ? products.find((p:any) => p.id === selectedProduct)?.name : 'Global Service Default'}
              </strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-neutral-800 pb-2">Provider Costs</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Provider Cost (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    name="provider_cost_percentage"
                    defaultValue={currentPricing.provider_cost_percentage || ''}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 95.00"
                  />
                  <span className="absolute right-3 top-2 text-neutral-500">%</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Percentage of face value charged by provider.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Provider Fixed Cost (KES)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="provider_cost_fixed"
                  defaultValue={currentPricing.provider_cost_fixed || ''}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. 20.00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-neutral-800 pb-2">Selling Price</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Selling Price (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    name="selling_price_percentage"
                    defaultValue={currentPricing.selling_price_percentage || ''}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 100.00"
                  />
                  <span className="absolute right-3 top-2 text-neutral-500">%</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">What the customer pays relative to face value.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Selling Fixed Fee (KES)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="selling_price_fixed"
                  defaultValue={currentPricing.selling_price_fixed || ''}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. 0.00"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800">
            <label className="flex items-center gap-3 cursor-pointer">
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
                className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-blue-600 focus:ring-blue-600 focus:ring-offset-neutral-900"
              />
              <span className="text-sm font-medium text-neutral-200">Enable Pricing Configuration</span>
            </label>
            <p className="text-xs text-neutral-500 ml-8 mt-1">If disabled, this specific pricing model will not apply.</p>
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (
                <>
                  <Save size={18} />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
