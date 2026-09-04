import { createClient } from '@/lib/supabase/server';
import { Layers, CheckCircle2, XCircle, ArrowRight, Settings2, Sparkles, Smartphone, Zap, Tv, Droplet, Wifi } from 'lucide-react';
import Link from 'next/link';

function getServiceIcon(type: string, slug: string) {
  if (type === 'airtime') return Smartphone;
  if (slug.includes('kplc') || slug.includes('electricity')) return Zap;
  if (type === 'tv' || slug.includes('dstv') || slug.includes('gotv') || slug.includes('zuku') || slug.includes('startimes')) return Tv;
  if (slug.includes('water')) return Droplet;
  return Wifi;
}

export default async function AdminServicesPage() {
  const supabase = await createClient();

  const { data: services, error } = await supabase
    .from('services')
    .select(`
      *,
      service_providers (
        name
      ),
      products (
        count
      ),
      pricing (
        provider_cost_percentage,
        selling_price_percentage,
        selling_price_fixed,
        is_active
      )
    `)
    .order('name');

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Services & Pricing Hub
              </h1>
              <p className="text-neutral-400 text-xs sm:text-sm">Configure provider costs, customer rates, and active utility margins.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
            {services?.length || 0} Total Services
          </span>
        </div>
      </div>

      {/* Services Table Card */}
      <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Provider</th>
                <th className="px-5 py-4">Current Margin</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {services?.map((service) => {
                const Icon = getServiceIcon(service.type, service.slug);
                const pricing = service.pricing?.[0];
                const provCost = pricing?.provider_cost_percentage ?? 95;
                const sellPrice = pricing?.selling_price_percentage ?? 100;
                const margin = sellPrice - provCost;

                return (
                  <tr key={service.id} className="hover:bg-neutral-800/40 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-emerald-400 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{service.name}</div>
                          <div className="text-[11px] font-mono text-neutral-500">{service.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700/40">
                        {service.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-neutral-300">
                      <span className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-neutral-300">
                        {service.service_providers?.name || 'Kyanda'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {pricing ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold font-mono text-emerald-400">
                            {margin.toFixed(1)}% Margin
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Cost: {provCost}% | Sell: {sellPrice}% {pricing.selling_price_fixed ? `+${pricing.selling_price_fixed} KES` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-500 italic">Default</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {service.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link 
                        href={`/admin/services/${service.id}/pricing`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl shadow-sm shadow-emerald-500/10 transition-all active:scale-95"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Pricing</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              
              {(!services || services.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                    No services found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
