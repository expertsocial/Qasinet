'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';

export async function savePricingAction(serviceId: string, productId: string | null, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  // Verify Admin rights
  const isAdmin = 
    user.app_metadata?.role === 'ADMIN' ||
    user.app_metadata?.is_admin === true ||
    user.email === 'sanaregeorge08@gmail.com';

  if (!isAdmin) {
    const { data: adminCheck } = await supabaseService.from('admins').select('id').eq('id', user.id).single();
    if (!adminCheck) {
      throw new Error('Forbidden: Admin access required');
    }
  }
  
  // Extract values
  const provider_cost_percentage = formData.get('provider_cost_percentage') !== '' && formData.get('provider_cost_percentage') !== null 
    ? Number(formData.get('provider_cost_percentage')) 
    : null;
  const provider_cost_fixed = formData.get('provider_cost_fixed') !== '' && formData.get('provider_cost_fixed') !== null 
    ? Number(formData.get('provider_cost_fixed')) 
    : null;
  const selling_price_percentage = formData.get('selling_price_percentage') !== '' && formData.get('selling_price_percentage') !== null 
    ? Number(formData.get('selling_price_percentage')) 
    : null;
  const selling_price_fixed = formData.get('selling_price_fixed') !== '' && formData.get('selling_price_fixed') !== null 
    ? Number(formData.get('selling_price_fixed')) 
    : null;
  const is_active = formData.get('is_active') === 'true';

  // Check if existing record
  let query = supabaseService.from('pricing').select('id');
  if (productId) {
    query = query.eq('product_id', productId);
  } else {
    query = query.eq('service_id', serviceId).is('product_id', null);
  }
  
  const { data: existing } = await query.maybeSingle();

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
    const res = await supabaseService.from('pricing').update(payload).eq('id', existing.id);
    error = res.error;
    await logAdminAction({
      action: 'UPDATE_PRICING',
      targetTable: 'pricing',
      targetId: existing.id,
      details: { payload, updatedBy: user.email }
    });
  } else {
    const res = await supabaseService.from('pricing').insert(payload);
    error = res.error;
    await logAdminAction({
      action: 'CREATE_PRICING',
      targetTable: 'pricing',
      details: { payload, createdBy: user.email }
    });
  }

  if (error) {
    console.error('Pricing save error:', error);
    throw new Error(error.message);
  }

  revalidatePath(`/admin/services/${serviceId}/pricing`);
  revalidatePath('/admin/services');
  return { success: true };
}

export async function createProductAction(serviceId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  const name = formData.get('name')?.toString().trim();
  const provider_product_id = formData.get('provider_product_id')?.toString().trim() || name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const provider_cost_fixed = formData.get('provider_cost_fixed') !== '' ? Number(formData.get('provider_cost_fixed')) : null;
  const selling_price_fixed = formData.get('selling_price_fixed') !== '' ? Number(formData.get('selling_price_fixed')) : null;

  if (!name) {
    throw new Error('Product / Bundle name is required');
  }

  // 1. Insert product
  const { data: newProd, error: prodErr } = await supabaseService
    .from('products')
    .insert({
      service_id: serviceId,
      name,
      provider_product_id,
      is_active: true
    })
    .select()
    .single();

  if (prodErr || !newProd) {
    console.error('Error creating product:', prodErr);
    throw new Error(prodErr?.message || 'Failed to create product');
  }

  // 2. Insert initial pricing
  if (selling_price_fixed !== null || provider_cost_fixed !== null) {
    const { error: prErr } = await supabaseService
      .from('pricing')
      .insert({
        product_id: newProd.id,
        provider_cost_fixed,
        selling_price_fixed,
        selling_price_percentage: 100,
        is_active: true
      });

    if (prErr) {
      console.error('Error creating product pricing:', prErr);
    }
  }

  await logAdminAction({
    action: 'CREATE_PRODUCT',
    targetTable: 'products',
    targetId: newProd.id,
    details: { name, serviceId, provider_cost_fixed, selling_price_fixed, createdBy: user.email }
  });

  revalidatePath(`/admin/services/${serviceId}/pricing`);
  revalidatePath('/admin/services');
  return { success: true, product: newProd };
}

export async function deleteProductAction(serviceId: string, productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  // 1. Delete associated pricing
  await supabaseService.from('pricing').delete().eq('product_id', productId);

  // 2. Delete product
  const { error } = await supabaseService.from('products').delete().eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    throw new Error(error.message);
  }

  await logAdminAction({
    action: 'DELETE_PRODUCT',
    targetTable: 'products',
    targetId: productId,
    details: { productId, serviceId, deletedBy: user.email }
  });

  revalidatePath(`/admin/services/${serviceId}/pricing`);
  revalidatePath('/admin/services');
  return { success: true };
}

