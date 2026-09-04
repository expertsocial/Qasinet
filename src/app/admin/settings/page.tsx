import { createClient } from '@/lib/supabase/server';
import { Settings } from 'lucide-react';
import SettingsFormClient from './SettingsFormClient';

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('system_settings')
    .select('*');

  const settingsMap = (settings || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  // Default values if missing
  const generalConfig = settingsMap['general_config'] || {
    site_name: 'QasiNet',
    currency: 'KES',
    timezone: 'Africa/Nairobi'
  };

  const kyandaConfig = settingsMap['kyanda_config'] || {
    api_url: 'https://api.kyanda.com',
    merchant_id: '',
    api_key: '',
    callback_url: ''
  };

  const resendConfig = settingsMap['resend_config'] || {
    api_key: process.env.RESEND_API_KEY || '',
    from_email: process.env.RESEND_FROM_EMAIL || 'QasiNet <onboarding@resend.dev>'
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="text-blue-500" />
            System Settings
          </h1>
          <p className="text-neutral-400 mt-1">Manage global application configuration and integrations.</p>
        </div>
      </div>

      <SettingsFormClient 
        generalConfig={generalConfig} 
        kyandaConfig={kyandaConfig} 
        resendConfig={resendConfig}
      />
    </div>
  );

}
