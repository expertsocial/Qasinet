import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch active services and their products
    const { data: services, error } = await supabase
      .from('services')
      .select(`
        *,
        products (
          id,
          name,
          is_active,
          pricing (
            selling_price_percentage,
            selling_price_fixed
          )
        ),
        pricing (
          selling_price_percentage,
          selling_price_fixed
        )
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json(services);
  } catch (error) {
    console.error('Internal API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
