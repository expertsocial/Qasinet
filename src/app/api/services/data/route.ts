import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface ParsedBundleInfo {
  allowance: string;
  validity: string;
  category: 'Daily' | 'Weekly' | 'Monthly' | 'Special';
}

export function parseBundleInfo(productName: string, price?: number): ParsedBundleInfo {
  const allowanceMatch = productName.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/i);
  const allowance = allowanceMatch ? allowanceMatch[1].toUpperCase() : productName;

  const validityMatch = productName.match(/(\d+\s*(?:Hours?|Hrs?|Days?|Weeks?|Months?)|24\s*Hours?|7\s*Days?|30\s*Days?|24\s*Hrs?|7\s*Days?)/i);
  let validity = validityMatch ? validityMatch[1] : 'Standard';

  let category: 'Daily' | 'Weekly' | 'Monthly' | 'Special' = 'Special';
  const lower = productName.toLowerCase();

  if (lower.includes('daily') || lower.includes('24 hour') || lower.includes('24hr') || lower.includes('24 hours') || lower.includes('1 day')) {
    category = 'Daily';
    if (!validityMatch) validity = '24 Hours';
  } else if (lower.includes('weekly') || lower.includes('7 day') || lower.includes('7day') || lower.includes('7 days') || lower.includes('1 week')) {
    category = 'Weekly';
    if (!validityMatch) validity = '7 Days';
  } else if (lower.includes('monthly') || lower.includes('30 day') || lower.includes('30day') || lower.includes('30 days') || lower.includes('1 month')) {
    category = 'Monthly';
    if (!validityMatch) validity = '30 Days';
  } else if (lower.includes('giga') || lower.includes('special') || lower.includes('night') || lower.includes('unlimited')) {
    category = 'Special';
  }

  return {
    allowance,
    validity,
    category
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all data services and active bundle products with their pricing
    const { data: services, error } = await supabase
      .from('services')
      .select(`
        id,
        name,
        slug,
        type,
        is_active,
        products (
          id,
          name,
          provider_product_id,
          is_active,
          pricing (
            id,
            provider_cost_fixed,
            provider_cost_percentage,
            selling_price_fixed,
            selling_price_percentage,
            is_active
          )
        )
      `)
      .eq('type', 'data')
      .eq('is_active', true);

    if (error) {
      console.error('[API Data Services] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch data services' }, { status: 500 });
    }

    const networkMap: Record<string, any[]> = {
      Safaricom: [],
      Airtel: [],
      Telkom: [],
      Faiba: [],
      Equitel: []
    };

    services?.forEach((svc) => {
      let network = 'Safaricom';
      const slug = svc.slug.toLowerCase();
      if (slug.includes('airtel')) network = 'Airtel';
      else if (slug.includes('telkom')) network = 'Telkom';
      else if (slug.includes('faiba')) network = 'Faiba';
      else if (slug.includes('equitel')) network = 'Equitel';

      const activeProducts = svc.products?.filter((p: any) => p.is_active !== false) || [];

      const formattedBundles = activeProducts.map((prod: any) => {
        const pricing = prod.pricing?.[0] || {};
        const price = pricing.selling_price_fixed ?? 0;
        const cost = pricing.provider_cost_fixed ?? 0;
        const meta = parseBundleInfo(prod.name, price);

        return {
          id: prod.id,
          serviceId: svc.id,
          serviceSlug: svc.slug,
          name: prod.name,
          allowance: meta.allowance,
          validity: meta.validity,
          category: meta.category,
          price: Number(price),
          cost: Number(cost),
          network
        };
      });

      // Sort bundles by price ascending
      formattedBundles.sort((a: any, b: any) => a.price - b.price);

      networkMap[network] = formattedBundles;
    });

    return NextResponse.json({ networks: networkMap });
  } catch (error: any) {
    console.error('[API Data Services] Server error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
