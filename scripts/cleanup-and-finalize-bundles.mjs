import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const cleanCatalogue = {
  'safaricom-data': [
    { name: 'Daily 50MB (24 Hours)', code: 'DAILY_DATA_50MB', cost: 19, price: 20 },
    { name: 'Daily 200MB (24 Hours)', code: 'DAILY_DATA_200MB', cost: 48, price: 50 },
    { name: 'Daily 1GB (24 Hours)', code: 'DAILY_DATA_1GB', cost: 96, price: 100 },
    { name: 'Daily 2GB (24 Hours)', code: 'DAILY_DATA_2GB', cost: 240, price: 250 },
    { name: 'Weekly 350MB (7 Days)', code: 'WEEKLY_DATA_350MB', cost: 95, price: 99 },
    { name: 'Weekly 1GB (7 Days)', code: 'WEEKLY_DATA_1GB', cost: 240, price: 250 },
    { name: 'Weekly 3GB (7 Days)', code: 'WEEKLY_DATA_3GB', cost: 480, price: 500 },
    { name: 'Monthly 1.2GB (30 Days)', code: 'MONTHLY_DATA_1.2GB', cost: 480, price: 500 },
    { name: 'Monthly 3GB (30 Days)', code: 'MONTHLY_DATA_3GB', cost: 960, price: 1000 },
    { name: 'Monthly 10GB (30 Days)', code: 'MONTHLY_DATA_10GB', cost: 1920, price: 2000 },
    { name: 'Giga Bundle 15GB (30 Days)', code: 'GIGA_BUNDLE_15GB', cost: 2400, price: 2500 }
  ],
  'airtel-data': [
    { name: 'Bamba Daily 100MB (24 Hours)', code: 'DAILY_DATA_100MB', cost: 19, price: 20 },
    { name: 'Bamba Daily 1GB (24 Hours)', code: 'DAILY_DATA_1GB', cost: 95, price: 100 },
    { name: 'Bamba Daily 2GB (24 Hours)', code: 'DAILY_DATA_2GB', cost: 190, price: 200 },
    { name: 'Bamba Weekly 500MB (7 Days)', code: 'WEEKLY_DATA_500MB', cost: 95, price: 100 },
    { name: 'Bamba Weekly 2GB (7 Days)', code: 'WEEKLY_DATA_2GB', cost: 240, price: 250 },
    { name: 'Bamba Weekly 5GB (7 Days)', code: 'WEEKLY_DATA_5GB', cost: 475, price: 500 },
    { name: 'Bamba Monthly 2GB (30 Days)', code: 'MONTHLY_DATA_2GB', cost: 475, price: 500 },
    { name: 'Bamba Monthly 6GB (30 Days)', code: 'MONTHLY_DATA_6GB', cost: 950, price: 1000 },
    { name: 'Bamba Monthly 15GB (30 Days)', code: 'MONTHLY_DATA_15GB', cost: 1900, price: 2000 }
  ],
  'telkom-data': [
    { name: 'T-Kash Daily 150MB (24 Hours)', code: 'DAILY_DATA_150MB', cost: 19, price: 20 },
    { name: 'T-Kash Daily 1GB (24 Hours)', code: 'DAILY_DATA_1GB', cost: 95, price: 100 },
    { name: 'T-Kash Weekly 1GB (7 Days)', code: 'WEEKLY_DATA_1GB', cost: 95, price: 100 },
    { name: 'T-Kash Weekly 3GB (7 Days)', code: 'WEEKLY_DATA_3GB', cost: 240, price: 250 },
    { name: 'T-Kash Monthly 5GB (30 Days)', code: 'MONTHLY_DATA_5GB', cost: 475, price: 500 },
    { name: 'T-Kash Monthly 12GB (30 Days)', code: 'MONTHLY_DATA_12GB', cost: 950, price: 1000 }
  ],
  'faiba-data': [
    { name: 'Faiba Daily 100MB (24 Hours)', code: 'DAILY_DATA_100MB', cost: 9.5, price: 10 },
    { name: 'Faiba Daily 225MB (24 Hours)', code: 'DAILY_DATA_225MB', cost: 19, price: 20 },
    { name: 'Faiba Daily 1GB (24 Hours)', code: 'DailyData1GB', cost: 47.5, price: 50 },
    { name: 'Faiba 2.5GB (3 Days)', code: '3_DAYS_DATA_2.5GB', cost: 95, price: 100 },
    { name: 'Faiba Weekly 8GB (7 Days)', code: 'WeeklyData8GB', cost: 285, price: 300 },
    { name: 'Faiba 15GB (10 Days)', code: '10_DAY_DATA_15GB', cost: 475, price: 500 },
    { name: 'Faiba Monthly 30GB (30 Days)', code: 'MONTHLY_DATA_30GB', cost: 950, price: 1000 },
    { name: 'Faiba Monthly 65GB (30 Days)', code: 'MONTHLY_DATA_65GB', cost: 1900, price: 2000 },
    { name: 'Faiba 100GB (60 Days)', code: '60_DAY_DATA_100GB', cost: 2850, price: 3000 }
  ],
  'equitel-data': [
    { name: 'MyData Daily 80MB (24 Hours)', code: 'DAILY_DATA_80MB', cost: 19, price: 20 },
    { name: 'MyData Daily 500MB (24 Hours)', code: 'DAILY_DATA_500MB', cost: 95, price: 100 },
    { name: 'MyData Weekly 1GB (7 Days)', code: 'WEEKLY_DATA_1GB', cost: 240, price: 250 },
    { name: 'MyData Monthly 1.5GB (30 Days)', code: 'MONTHLY_DATA_1.5GB', cost: 475, price: 500 },
    { name: 'MyData Monthly 4GB (30 Days)', code: 'MONTHLY_DATA_4GB', cost: 950, price: 1000 }
  ]
};

async function cleanupAndFinalize() {
  console.log("Cleaning up old duplicate products and finalizing clean data catalogue...");

  for (const [slug, bundles] of Object.entries(cleanCatalogue)) {
    const { data: service } = await supabase.from('services').select('id, name').eq('slug', slug).single();
    if (!service) continue;

    console.log(`\nProcessing ${service.name}...`);

    // Fetch existing products for this service
    const { data: existingProds } = await supabase.from('products').select('id, name, provider_product_id').eq('service_id', service.id);
    
    // Clean up duplicate products: delete any pricing and products that don't match our clean catalogue
    for (const b of bundles) {
      // Find matching products
      const matches = existingProds?.filter(p => 
        p.name.toLowerCase().trim() === b.name.toLowerCase().trim() ||
        p.provider_product_id === b.code
      ) || [];

      let primaryProduct = null;

      if (matches.length > 0) {
        primaryProduct = matches[0];
        // If multiple duplicate products exist, remove the duplicates
        if (matches.length > 1) {
          for (let i = 1; i < matches.length; i++) {
            await supabase.from('pricing').delete().eq('product_id', matches[i].id);
            await supabase.from('products').delete().eq('id', matches[i].id);
          }
        }
        // Update primary product name and code
        await supabase.from('products').update({
          name: b.name,
          provider_product_id: b.code,
          is_active: true
        }).eq('id', primaryProduct.id);
      } else {
        // Insert clean product
        const { data: newP } = await supabase.from('products').insert({
          service_id: service.id,
          name: b.name,
          provider_product_id: b.code,
          is_active: true
        }).select('id').single();
        primaryProduct = newP;
      }

      if (primaryProduct) {
        // Ensure exact 1 pricing record
        const { data: priceRecords } = await supabase.from('pricing').select('id').eq('product_id', primaryProduct.id);
        if (priceRecords && priceRecords.length > 0) {
          await supabase.from('pricing').update({
            provider_cost_fixed: b.cost,
            selling_price_fixed: b.price,
            is_active: true,
            updated_at: new Date().toISOString()
          }).eq('id', priceRecords[0].id);

          // Remove any redundant duplicate price records
          if (priceRecords.length > 1) {
            for (let j = 1; j < priceRecords.length; j++) {
              await supabase.from('pricing').delete().eq('id', priceRecords[j].id);
            }
          }
        } else {
          await supabase.from('pricing').insert({
            product_id: primaryProduct.id,
            service_id: null,
            provider_cost_fixed: b.cost,
            selling_price_fixed: b.price,
            is_active: true
          });
        }
        console.log(`  ✓ ${b.name}: Selling KES ${b.price} (Cost: KES ${b.cost}, Code: ${b.code})`);
      }
    }
  }

  console.log("\nCatalogue cleanup and price normalization complete!");
}

cleanupAndFinalize();
