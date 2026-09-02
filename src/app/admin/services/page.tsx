import { createClient } from '@/lib/supabase/server';
import { Layers, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

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
      )
    `)
    .order('name');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-blue-500" />
            Services & Pricing
          </h1>
          <p className="text-neutral-400 mt-1">Manage platform services, products, and their pricing models.</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Service Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {services?.map((service) => (
              <tr key={service.id} className="hover:bg-neutral-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-200">{service.name}</div>
                  <div className="text-xs text-neutral-500">{service.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
                    {service.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-300">
                  {service.service_providers?.name || 'Unknown'}
                </td>
                <td className="px-4 py-3">
                  {service.is_active ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {service.products?.[0]?.count || 0} products
                </td>
                <td className="px-4 py-3 text-right">
                  <Link 
                    href={`/admin/services/${service.id}/pricing`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Configure Pricing
                    <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            
            {(!services || services.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No services found. Ensure migrations and seed scripts are run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
