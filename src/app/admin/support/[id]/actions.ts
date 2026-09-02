'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';

export async function updateTicketStatusAction(ticketId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('support_tickets')
    .update({ 
      status,
      assigned_to: user.id
    })
    .eq('id', ticketId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: 'UPDATE_TICKET_STATUS',
    targetTable: 'support_tickets',
    targetId: ticketId,
    details: { status, assigned_to: user.id }
  });

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath(`/admin/support`);
  return { success: true };
}
