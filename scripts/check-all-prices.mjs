import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAndFix() {
  const { data: services } = await supabase.from('services').select('id, name, slug, type').eq('type', 'data');
  console.log('Data services:', services);

  const { data: products } = await supabase.from('products').select(`
    id,
    name,
    provider_product_id,
    service_id,
    services (name, slug),
    pricing (id, provider_cost_fixed, selling_price_fixed, is_active)
  `);

  console.log('\n--- CURRENT PRODUCTS & PRICING ---');
  for (const p of products) {
    const pr = p.pricing?.[0];
    console.log(`[${p.services?.name}] "${p.name}" (ID: ${p.id}) -> Selling: KES ${pr?.selling_price_fixed}, Cost: KES ${pr?.provider_cost_fixed}, PricingID: ${pr?.id}`);
  }
}

inspectAndFix();
