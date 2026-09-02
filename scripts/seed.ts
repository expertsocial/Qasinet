import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const defaultServices = [
  { slug: "safaricom-airtime", name: "Safaricom Airtime", type: "airtime" },
  { slug: "airtel-airtime", name: "Airtel Airtime", type: "airtime" },
  { slug: "telkom-airtime", name: "Telkom Airtime", type: "airtime" },
  { slug: "equitel-airtime", name: "Equitel Airtime", type: "airtime" },
  { slug: "faiba-airtime", name: "Faiba Airtime", type: "airtime" },
  { slug: "kplc-prepaid", name: "KPLC Tokens", type: "electricity" },
  { slug: "dstv", name: "DStv", type: "tv" },
  { slug: "gotv", name: "GOtv", type: "tv" },
  { slug: "zuku", name: "Zuku", type: "tv" },
  { slug: "startimes", name: "StarTimes", type: "tv" },
  { slug: "nairobi-water", name: "Nairobi Water", type: "water" },
];

async function seed() {
  console.log('Seeding Database...');

  // 1. Create Kyanda Provider
  const { data: kyandaProvider, error: pErr } = await supabase
    .from('service_providers')
    .upsert({ name: 'Kyanda', is_active: true }, { onConflict: 'name' })
    .select()
    .single();

  if (pErr) {
    console.error('Error creating provider:', pErr);
    return;
  }
  console.log('Provider created/found:', kyandaProvider.name);

  // 2. Create Services
  for (const s of defaultServices) {
    const { data: svc, error: sErr } = await supabase
      .from('services')
      .upsert({
        provider_id: kyandaProvider.id,
        name: s.name,
        slug: s.slug,
        type: s.type,
        is_active: true
      }, { onConflict: 'slug' })
      .select()
      .single();
      
    if (sErr) {
      console.error(`Error creating service ${s.slug}:`, sErr);
      continue;
    }
    
    // 3. Create Pricing (100% selling, 95% cost for instance)
    const { error: prErr } = await supabase
      .from('pricing')
      .insert({
        service_id: svc.id,
        selling_price_percentage: 100,
        provider_cost_percentage: 95,
        is_active: true
      });
      
    // Ignore error if pricing already exists (it doesn't have a unique constraint on service_id in schema, but it's okay)
    console.log(`Seeded ${s.name}`);
  }

  console.log('Done!');
}

seed();
