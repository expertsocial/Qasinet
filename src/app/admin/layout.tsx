import Link from 'next/link';
import { LayoutDashboard, ReceiptText, Users, Network, Settings, LogOut, Sun, Moon, Layers, BarChart3, LifeBuoy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch admin profile for name display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <Link href="/admin" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-emerald-500">QasiNet</span> Admin
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/admin/transactions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <ReceiptText size={20} />
            <span className="font-medium">Transactions</span>
          </Link>
          <Link href="/admin/customers" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <Users size={20} />
            <span className="font-medium">Customers</span>
          </Link>
          <Link href="/admin/services" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <Layers size={20} />
            <span className="font-medium">Services & Pricing</span>
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <BarChart3 size={20} />
            <span className="font-medium">Reports</span>
          </Link>
          <Link href="/admin/kyanda" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <Network size={20} />
            <span className="font-medium">Kyanda Ops</span>
          </Link>
          <Link href="/admin/support" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            <LifeBuoy size={20} />
            <span className="font-medium">Support Tickets</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors mb-2">
            <Settings size={20} />
            <span className="font-medium">System Settings</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">Operations Center</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-neutral-400 font-medium">
              {profile?.full_name || user.email}
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              {(profile?.full_name?.[0] || user.email?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-6 bg-neutral-900/50">
          {children}
        </div>
      </main>
    </div>
  );
}
