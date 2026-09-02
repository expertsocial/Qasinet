import { createClient } from '@/lib/supabase/server';
import { Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PricingFormClient from './PricingFormClient';

export default async function PricingPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: service } = await supabase
    .from('services')
    .select(`
      *,
      service_providers (name)
    `)
    .eq('id', params.id)
    .single();

  if (!service) {
    notFound();
  }

  // Fetch products for this service
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('service_id', params.id)
    .order('name');

  // Fetch existing pricing
  const { data: pricingRecords } = await supabase
    .from('pricing')
    .select('*')
    .eq('service_id', params.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/admin/services" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Services
      </Link>
      
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="text-blue-500" />
          Pricing: {service.name}
        </h1>
        <p className="text-neutral-400 mt-1">Configure pricing models for {service.name} and its individual products.</p>
      </div>

      <PricingFormClient 
        service={service} 
        products={products || []} 
        pricingRecords={pricingRecords || []} 
      />
    </div>
  );
}
