import { createClient } from '@/lib/supabase/server';

export async function logAdminAction({
  action,
  targetTable,
  targetId,
  details
}: {
  action: string;
  targetTable?: string;
  targetId?: string;
  details?: Record<string, any>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  // In a Next.js App Router server action, we might extract the IP using headers()
  // but for simplicity in this utility, we rely on the DB or we can optionally pass it.
  
  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    action,
    target_table: targetTable,
    target_id: targetId,
    details,
    // ip_address is omitted here for simplicity unless passed via the request headers
  });
}
