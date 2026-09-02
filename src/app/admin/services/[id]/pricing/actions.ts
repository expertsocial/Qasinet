'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';

export async function savePricingAction(serviceId: string, productId: string | null, formData: FormData) {
  const supabase = await createClient();
  
  // Extract values
  const provider_cost_percentage = formData.get('provider_cost_percentage') ? Number(formData.get('provider_cost_percentage')) : null;
  const provider_cost_fixed = formData.get('provider_cost_fixed') ? Number(formData.get('provider_cost_fixed')) : null;
  const selling_price_percentage = formData.get('selling_price_percentage') ? Number(formData.get('selling_price_percentage')) : null;
  const selling_price_fixed = formData.get('selling_price_fixed') ? Number(formData.get('selling_price_fixed')) : null;
  const is_active = formData.get('is_active') === 'true';

  // Check if existing record
  let query = supabase.from('pricing').select('id');
  if (productId) {
    query = query.eq('product_id', productId).is('service_id', null);
  } else {
    query = query.eq('service_id', serviceId).is('product_id', null);
  }
  
  const { data: existing } = await query.single();

  const payload = {
    service_id: productId ? null : serviceId,
    product_id: productId || null,
    provider_cost_percentage,
    provider_cost_fixed,
    selling_price_percentage,
    selling_price_fixed,
    is_active
  };

  let error;
  if (existing) {
    const res = await supabase.from('pricing').update(payload).eq('id', existing.id);
    error = res.error;
    await logAdminAction({
      action: 'UPDATE_PRICING',
      targetTable: 'pricing',
      targetId: existing.id,
      details: { payload }
    });
  } else {
    const res = await supabase.from('pricing').insert(payload);
    error = res.error;
    await logAdminAction({
      action: 'CREATE_PRICING',
      targetTable: 'pricing',
      details: { payload }
    });
  }

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/services/${serviceId}/pricing`);
  return { success: true };
}
