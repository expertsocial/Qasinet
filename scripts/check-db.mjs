import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: services, error: sErr } = await supabase.from('services').select('*');
  console.log('Services count:', services?.length, sErr || '');
  console.log('Services:', services?.map(s => `${s.name} (${s.slug}, type: ${s.type})`));

  const { data: products, error: pErr } = await supabase.from('products').select('*');
  console.log('Products count:', products?.length, pErr || '');

  const { data: pricing, error: prErr } = await supabase.from('pricing').select('*');
  console.log('Pricing records count:', pricing?.length, prErr || '');
}

check();
