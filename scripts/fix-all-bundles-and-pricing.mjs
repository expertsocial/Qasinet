import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const bundlesData = {
  'safaricom-data': [
    { name: 'Daily 50MB (24 Hours)', provider_product_id: 'DAILY_DATA_50MB', cost: 19, price: 20 },
    { name: 'Daily 200MB (24 Hours)', provider_product_id: 'DAILY_DATA_200MB', cost: 48, price: 50 },
    { name: 'Daily 1GB (24 Hours)', provider_product_id: 'DAILY_DATA_1GB', cost: 96, price: 100 },
    { name: 'Daily 2GB (24 Hours)', provider_product_id: 'DAILY_DATA_2GB', cost: 240, price: 250 },
    { name: 'Weekly 350MB (7 Days)', provider_product_id: 'WEEKLY_DATA_350MB', cost: 95, price: 99 },
    { name: 'Weekly 1GB (7 Days)', provider_product_id: 'WEEKLY_DATA_1GB', cost: 240, price: 250 },
    { name: 'Weekly 3GB (7 Days)', provider_product_id: 'WEEKLY_DATA_3GB', cost: 480, price: 500 },
    { name: 'Monthly 1.2GB (30 Days)', provider_product_id: 'MONTHLY_DATA_1.2GB', cost: 480, price: 500 },
    { name: 'Monthly 3GB (30 Days)', provider_product_id: 'MONTHLY_DATA_3GB', cost: 960, price: 1000 },
    { name: 'Monthly 10GB (30 Days)', provider_product_id: 'MONTHLY_DATA_10GB', cost: 1920, price: 2000 },
    { name: 'Giga Bundle 15GB (30 Days)', provider_product_id: 'GIGA_BUNDLE_15GB', cost: 2400, price: 2500 },
  ],
  'airtel-data': [
    { name: 'Bamba Daily 100MB (24 Hours)', provider_product_id: 'DAILY_DATA_100MB', cost: 19, price: 20 },
    { name: 'Bamba Daily 1GB (24 Hours)', provider_product_id: 'DAILY_DATA_1GB', cost: 95, price: 100 },
    { name: 'Bamba Daily 2GB (24 Hours)', provider_product_id: 'DAILY_DATA_2GB', cost: 190, price: 200 },
    { name: 'Bamba Weekly 500MB (7 Days)', provider_product_id: 'WEEKLY_DATA_500MB', cost: 95, price: 100 },
    { name: 'Bamba Weekly 2GB (7 Days)', provider_product_id: 'WEEKLY_DATA_2GB', cost: 240, price: 250 },
    { name: 'Bamba Weekly 5GB (7 Days)', provider_product_id: 'WEEKLY_DATA_5GB', cost: 475, price: 500 },
    { name: 'Bamba Monthly 2GB (30 Days)', provider_product_id: 'MONTHLY_DATA_2GB', cost: 475, price: 500 },
    { name: 'Bamba Monthly 6GB (30 Days)', provider_product_id: 'MONTHLY_DATA_6GB', cost: 950, price: 1000 },
    { name: 'Bamba Monthly 15GB (30 Days)', provider_product_id: 'MONTHLY_DATA_15GB', cost: 1900, price: 2000 },
  ],
  'telkom-data': [
    { name: 'T-Kash Daily 150MB (24 Hours)', provider_product_id: 'DAILY_DATA_150MB', cost: 19, price: 20 },
    { name: 'T-Kash Daily 1GB (24 Hours)', provider_product_id: 'DAILY_DATA_1GB', cost: 95, price: 100 },
    { name: 'T-Kash Weekly 1GB (7 Days)', provider_product_id: 'WEEKLY_DATA_1GB', cost: 95, price: 100 },
    { name: 'T-Kash Weekly 3GB (7 Days)', provider_product_id: 'WEEKLY_DATA_3GB', cost: 240, price: 250 },
    { name: 'T-Kash Monthly 5GB (30 Days)', provider_product_id: 'MONTHLY_DATA_5GB', cost: 475, price: 500 },
    { name: 'T-Kash Monthly 12GB (30 Days)', provider_product_id: 'MONTHLY_DATA_12GB', cost: 950, price: 1000 },
  ],
  'faiba-data': [
    { name: 'Faiba Daily 100MB (24 Hours)', provider_product_id: 'DAILY_DATA_100MB', cost: 9.5, price: 10 },
    { name: 'Faiba Daily 225MB (24 Hours)', provider_product_id: 'DAILY_DATA_225MB', cost: 19, price: 20 },
    { name: 'Faiba Daily 1GB (24 Hours)', provider_product_id: 'DailyData1GB', cost: 47.5, price: 50 },
    { name: 'Faiba 2.5GB (3 Days)', provider_product_id: '3_DAYS_DATA_2.5GB', cost: 95, price: 100 },
    { name: 'Faiba Weekly 8GB (7 Days)', provider_product_id: 'WeeklyData8GB', cost: 285, price: 300 },
    { name: 'Faiba 15GB (10 Days)', provider_product_id: '10_DAY_DATA_15GB', cost: 475, price: 500 },
    { name: 'Faiba Monthly 30GB (30 Days)', provider_product_id: 'MONTHLY_DATA_30GB', cost: 950, price: 1000 },
    { name: 'Faiba Monthly 65GB (30 Days)', provider_product_id: 'MONTHLY_DATA_65GB', cost: 1900, price: 2000 },
    { name: 'Faiba 100GB (60 Days)', provider_product_id: '60_DAY_DATA_100GB', cost: 2850, price: 3000 },
  ],
  'equitel-data': [
    { name: 'MyData Daily 80MB (24 Hours)', provider_product_id: 'DAILY_DATA_80MB', cost: 19, price: 20 },
    { name: 'MyData Daily 500MB (24 Hours)', provider_product_id: 'DAILY_DATA_500MB', cost: 95, price: 100 },
    { name: 'MyData Weekly 1GB (7 Days)', provider_product_id: 'WEEKLY_DATA_1GB', cost: 240, price: 250 },
    { name: 'MyData Monthly 1.5GB (30 Days)', provider_product_id: 'MONTHLY_DATA_1.5GB', cost: 475, price: 500 },
    { name: 'MyData Monthly 4GB (30 Days)', provider_product_id: 'MONTHLY_DATA_4GB', cost: 950, price: 1000 },
  ]
};

async function fixAllPricing() {
  console.log("Fixing and updating all bundle products and pricing...");

  for (const [slug, bundles] of Object.entries(bundlesData)) {
    const { data: service, error: sErr } = await supabase
      .from('services')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (sErr || !service) {
      console.error(`Service ${slug} not found:`, sErr);
      continue;
    }

    console.log(`\nUpdating bundles for ${service.name} (${slug})...`);

    for (const item of bundles) {
      // Find existing product by name or provider_product_id
      const { data: existingProds } = await supabase
        .from('products')
        .select('id, name')
        .eq('service_id', service.id)
        .or(`name.ilike.%${item.name}%,provider_product_id.eq.${item.provider_product_id}`);

      let productId = null;

      if (existingProds && existingProds.length > 0) {
        productId = existingProds[0].id;
        // Update product metadata
        await supabase
          .from('products')
          .update({
            name: item.name,
            provider_product_id: item.provider_product_id,
            is_active: true
          })
          .eq('id', productId);
      } else {
        // Insert new product
        const { data: newProd, error: pErr } = await supabase
          .from('products')
          .insert({
            service_id: service.id,
            name: item.name,
            provider_product_id: item.provider_product_id,
            is_active: true
          })
          .select('id')
          .single();

        if (pErr) {
          console.error(`Error inserting product ${item.name}:`, pErr);
          continue;
        }
        productId = newProd.id;
      }

      // Upsert pricing
      const { data: existingPrice } = await supabase
        .from('pricing')
        .select('id')
        .eq('product_id', productId)
        .single();

      if (existingPrice) {
        await supabase
          .from('pricing')
          .update({
            provider_cost_fixed: item.cost,
            selling_price_fixed: item.price,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPrice.id);
        console.log(`  ✓ Updated pricing: "${item.name}" -> Selling: KES ${item.price}, Cost: KES ${item.cost}`);
      } else {
        await supabase
          .from('pricing')
          .insert({
            product_id: productId,
            service_id: null,
            provider_cost_fixed: item.cost,
            selling_price_fixed: item.price,
            is_active: true
          });
        console.log(`  ✓ Inserted pricing: "${item.name}" -> Selling: KES ${item.price}, Cost: KES ${item.cost}`);
      }
    }
  }

  console.log("\nAll bundles and pricing successfully updated!");
}

fixAllPricing();
