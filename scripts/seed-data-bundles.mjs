import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_SERVICES = [
  {
    name: 'Safaricom Data',
    slug: 'safaricom-data',
    type: 'data',
    bundles: [
      { name: 'Daily 50MB (24 Hours)', allowance: '50 MB', validity: '24 Hours', category: 'Daily', price: 20, cost: 19 },
      { name: 'Daily 200MB (24 Hours)', allowance: '200 MB', validity: '24 Hours', category: 'Daily', price: 50, cost: 48 },
      { name: 'Daily 1GB (24 Hours)', allowance: '1 GB', validity: '24 Hours', category: 'Daily', price: 99, cost: 95 },
      { name: 'Weekly 350MB (7 Days)', allowance: '350 MB', validity: '7 Days', category: 'Weekly', price: 99, cost: 95 },
      { name: 'Weekly 1GB (7 Days)', allowance: '1 GB', validity: '7 Days', category: 'Weekly', price: 250, cost: 240 },
      { name: 'Weekly 3GB (7 Days)', allowance: '3 GB', validity: '7 Days', category: 'Weekly', price: 500, cost: 480 },
      { name: 'Monthly 1.2GB (30 Days)', allowance: '1.2 GB', validity: '30 Days', category: 'Monthly', price: 500, cost: 480 },
      { name: 'Monthly 3GB (30 Days)', allowance: '3 GB', validity: '30 Days', category: 'Monthly', price: 1000, cost: 960 },
      { name: 'Monthly 10GB (30 Days)', allowance: '10 GB', validity: '30 Days', category: 'Monthly', price: 2000, cost: 1920 },
      { name: 'Giga Bundle 15GB (30 Days)', allowance: '15 GB', validity: '30 Days', category: 'Special', price: 2500, cost: 2400 }
    ]
  },
  {
    name: 'Airtel Data',
    slug: 'airtel-data',
    type: 'data',
    bundles: [
      { name: 'Bamba Daily 100MB (24 Hours)', allowance: '100 MB', validity: '24 Hours', category: 'Daily', price: 20, cost: 19 },
      { name: 'Bamba Daily 1.5GB (24 Hours)', allowance: '1.5 GB', validity: '24 Hours', category: 'Daily', price: 100, cost: 95 },
      { name: 'Bamba Weekly 500MB (7 Days)', allowance: '500 MB', validity: '7 Days', category: 'Weekly', price: 100, cost: 95 },
      { name: 'Bamba Weekly 2GB (7 Days)', allowance: '2 GB', validity: '7 Days', category: 'Weekly', price: 250, cost: 240 },
      { name: 'Bamba Monthly 2GB (30 Days)', allowance: '2 GB', validity: '30 Days', category: 'Monthly', price: 500, cost: 475 },
      { name: 'Bamba Monthly 6GB (30 Days)', allowance: '6 GB', validity: '30 Days', category: 'Monthly', price: 1000, cost: 950 }
    ]
  },
  {
    name: 'Telkom Data',
    slug: 'telkom-data',
    type: 'data',
    bundles: [
      { name: 'T-Kash Daily 150MB (24 Hours)', allowance: '150 MB', validity: '24 Hours', category: 'Daily', price: 20, cost: 19 },
      { name: 'T-Kash Weekly 1GB (7 Days)', allowance: '1 GB', validity: '7 Days', category: 'Weekly', price: 100, cost: 95 },
      { name: 'T-Kash Monthly 5GB (30 Days)', allowance: '5 GB', validity: '30 Days', category: 'Monthly', price: 500, cost: 475 }
    ]
  },
  {
    name: 'Faiba Data',
    slug: 'faiba-data',
    type: 'data',
    bundles: [
      { name: 'Faiba Daily 1GB (24 Hours)', allowance: '1 GB', validity: '24 Hours', category: 'Daily', price: 50, cost: 47 },
      { name: 'Faiba Weekly 8GB (7 Days)', allowance: '8 GB', validity: '7 Days', category: 'Weekly', price: 300, cost: 285 },
      { name: 'Faiba Monthly 25GB (30 Days)', allowance: '25 GB', validity: '30 Days', category: 'Monthly', price: 1000, cost: 950 }
    ]
  },
  {
    name: 'Equitel Data',
    slug: 'equitel-data',
    type: 'data',
    bundles: [
      { name: 'MyData Daily 80MB (24 Hours)', allowance: '80 MB', validity: '24 Hours', category: 'Daily', price: 20, cost: 19 },
      { name: 'MyData Monthly 1.5GB (30 Days)', allowance: '1.5 GB', validity: '30 Days', category: 'Monthly', price: 500, cost: 475 }
    ]
  }
];

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await wait(500 * (i + 1));
    }
  }
}

async function seedDataServices() {
  console.log('Seeding Data Services & Products...');

  const { data: kyandaProvider } = await retryOp(() => 
    supabase
      .from('service_providers')
      .upsert({ name: 'Kyanda', is_active: true }, { onConflict: 'name' })
      .select()
      .single()
  );

  for (const s of DATA_SERVICES) {
    const { data: svc } = await retryOp(() =>
      supabase
        .from('services')
        .upsert({
          provider_id: kyandaProvider.id,
          name: s.name,
          slug: s.slug,
          type: s.type,
          is_active: true
        }, { onConflict: 'slug' })
        .select()
        .single()
    );

    console.log(`Service verified: ${svc.name} (${svc.id})`);

    const { data: existingSvcPricing } = await retryOp(() =>
      supabase
        .from('pricing')
        .select('id')
        .eq('service_id', svc.id)
        .is('product_id', null)
        .maybeSingle()
    );

    if (!existingSvcPricing) {
      await retryOp(() =>
        supabase.from('pricing').insert({
          service_id: svc.id,
          provider_cost_percentage: 95,
          selling_price_percentage: 100,
          is_active: true
        })
      );
    }

    for (const b of s.bundles) {
      const { data: existingProd } = await retryOp(() =>
        supabase
          .from('products')
          .select('id')
          .eq('service_id', svc.id)
          .eq('name', b.name)
          .maybeSingle()
      );

      let productId = existingProd?.id;

      if (!productId) {
        const { data: newProd } = await retryOp(() =>
          supabase
            .from('products')
            .insert({
              service_id: svc.id,
              name: b.name,
              provider_product_id: b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              is_active: true
            })
            .select()
            .single()
        );
        productId = newProd?.id;
      }

      if (productId) {
        const { data: existingPricing } = await retryOp(() =>
          supabase
            .from('pricing')
            .select('id')
            .eq('product_id', productId)
            .maybeSingle()
        );

        if (!existingPricing) {
          await retryOp(() =>
            supabase
              .from('pricing')
              .insert({
                product_id: productId,
                provider_cost_fixed: b.cost,
                selling_price_fixed: b.price,
                selling_price_percentage: 100,
                is_active: true
              })
          );
          console.log(`  ✓ Product seeded: ${b.name} -> KES ${b.price} (Cost: KES ${b.cost})`);
        } else {
          console.log(`  ✓ Product exists: ${b.name}`);
        }
      }
      await wait(100);
    }
  }

  console.log('✅ ALL real data bundle services, products, and prices seeded successfully!');
}

seedDataServices();
