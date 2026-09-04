import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeaderControls } from '@/components/admin/AdminHeaderControls';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch admin profile for name display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      {/* Dynamic Sidebar */}
      <AdminSidebar 
        userEmail={user.email || 'admin@qasinet.com'} 
        userName={profile?.full_name} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Engine Online</span>
            </div>
            <span className="hidden sm:inline text-neutral-500 text-xs">|</span>
            <span className="hidden sm:inline text-xs text-neutral-400 font-medium">Production Safaricom & Kyanda Gateway</span>
          </div>

          <AdminHeaderControls 
            userInitials={(profile?.full_name?.[0] || user.email?.[0] || 'A').toUpperCase()} 
          />
        </header>

        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-neutral-900/40">
          {children}
        </main>
      </div>
    </div>
  );
}
