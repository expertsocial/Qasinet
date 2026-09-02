'use client';

import { useState } from 'react';
import { saveSettingsAction, testKyandaConnectionAction } from './actions';
import { Save, Server, Globe, Key, Link as LinkIcon, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsFormClient({ generalConfig, kyandaConfig }: any) {
  const [activeTab, setActiveTab] = useState<'general' | 'kyanda'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kyanda state
  const [apiUrl, setApiUrl] = useState(kyandaConfig.api_url || '');
  const [merchantId, setMerchantId] = useState(kyandaConfig.merchant_id || '');
  const [apiKey, setApiKey] = useState(kyandaConfig.api_key || '');
  const [callbackUrl, setCallbackUrl] = useState(kyandaConfig.callback_url || '');

  async function handleSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const value = {
      site_name: formData.get('site_name'),
      currency: formData.get('currency'),
      timezone: formData.get('timezone')
    };

    try {
      await saveSettingsAction('general_config', value, 'General Site Settings');
      toast.success('General settings saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveKyanda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    // Check if user actually entered a new key, or if they left it blank because it's masked
    // If blank, keep the old one
    const newApiKey = apiKey.trim() === '' ? kyandaConfig.api_key : apiKey;

    const value = {
      api_url: apiUrl,
      merchant_id: merchantId,
      api_key: newApiKey,
      callback_url: callbackUrl
    };

    try {
      await saveSettingsAction('kyanda_config', value, 'Kyanda API Configuration');
      toast.success('Kyanda settings saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    const newApiKey = apiKey.trim() === '' ? kyandaConfig.api_key : apiKey;
    
    const result = await testKyandaConnectionAction(apiUrl, merchantId, newApiKey);
    setTestResult(result);
    setIsTesting(false);
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
          }`}
        >
          <Globe size={18} />
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('kyanda')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'kyanda' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
          }`}
        >
          <Server size={18} />
          Kyanda Integration
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Site Name</label>
              <input 
                type="text" 
                name="site_name"
                defaultValue={generalConfig.site_name}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Default Currency</label>
                <input 
                  type="text" 
                  name="currency"
                  defaultValue={generalConfig.currency}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Timezone</label>
                <input 
                  type="text" 
                  name="timezone"
                  defaultValue={generalConfig.timezone}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'kyanda' && (
          <form onSubmit={handleSaveKyanda} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">API Base URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon size={16} className="text-neutral-500" />
                </div>
                <input 
                  type="url" 
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Merchant ID</label>
              <input 
                type="text" 
                value={merchantId}
                onChange={e => setMerchantId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">API Key / Security Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={16} className="text-neutral-500" />
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={kyandaConfig.api_key ? '••••••••••••••••' : 'Enter API Key'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">Leave blank to keep existing key. Key is masked for security.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Callback URL</label>
              <input 
                type="url" 
                value={callbackUrl}
                onChange={e => setCallbackUrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-neutral-500 mt-1">The URL where Kyanda sends webhooks (must be publicly accessible).</p>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {testResult.success ? <CheckCircle2 className="shrink-0" /> : <XCircle className="shrink-0" />}
                <div>
                  <h4 className="font-medium text-sm">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</h4>
                  <p className="text-xs mt-1 opacity-80">{testResult.message}</p>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t border-neutral-800">
              <button 
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !apiUrl || !merchantId}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              <button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
