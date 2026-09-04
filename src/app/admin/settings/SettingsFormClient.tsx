'use client';

import { useState } from 'react';
import { saveSettingsAction, testKyandaConnectionAction, testResendConnectionAction } from './actions';
import { Save, Server, Globe, Key, Link as LinkIcon, CheckCircle2, XCircle, Mail, Send, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsFormClient({ generalConfig, kyandaConfig, resendConfig = {} }: any) {
  const [activeTab, setActiveTab] = useState<'general' | 'kyanda' | 'resend'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kyanda state
  const [apiUrl, setApiUrl] = useState(kyandaConfig.api_url || '');
  const [merchantId, setMerchantId] = useState(kyandaConfig.merchant_id || '');
  const [apiKey, setApiKey] = useState(kyandaConfig.api_key || '');
  const [callbackUrl, setCallbackUrl] = useState(kyandaConfig.callback_url || '');

  // Resend state
  const [resendApiKey, setResendApiKey] = useState(resendConfig.api_key || '');
  const [resendFromEmail, setResendFromEmail] = useState(resendConfig.from_email || 'QasiNet <onboarding@resend.dev>');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [resendTestResult, setResendTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  async function handleSaveResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const newApiKey = resendApiKey.trim() === '' ? resendConfig.api_key : resendApiKey;

    const value = {
      api_key: newApiKey,
      from_email: resendFromEmail.trim() || 'QasiNet <onboarding@resend.dev>'
    };

    try {
      await saveSettingsAction('resend_config', value, 'Resend Email Configuration');
      toast.success('Resend email settings saved');
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

  async function handleTestResendEmail() {
    if (!testEmailRecipient.trim()) {
      toast.error('Please enter a recipient email address to send test email');
      return;
    }

    setIsTesting(true);
    setResendTestResult(null);
    const effectiveKey = resendApiKey.trim() || resendConfig.api_key;
    
    const result = await testResendConnectionAction(effectiveKey, resendFromEmail, testEmailRecipient.trim());
    setResendTestResult(result);
    setIsTesting(false);

    if (result.success) {
      toast.success('Test email sent successfully! Check your inbox.');
    } else {
      toast.error(result.message || 'Failed to send test email');
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
      <div className="flex border-b border-neutral-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
          }`}
        >
          <Globe size={18} />
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('kyanda')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'kyanda' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
          }`}
        >
          <Server size={18} />
          Kyanda Integration
        </button>
        <button
          onClick={() => setActiveTab('resend')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'resend' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
          }`}
        >
          <Mail size={18} />
          Email Service (Resend)
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

        {activeTab === 'resend' && (
          <form onSubmit={handleSaveResend} className="space-y-6 max-w-2xl">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Resend Transactional Email Service
                </h4>
                <p className="text-xs text-neutral-300 mt-1">
                  Powers instant receipts, KPLC electricity tokens, and transaction notifications to customers.
                </p>
              </div>
              <a 
                href="https://resend.com/api-keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 shrink-0 font-medium"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Resend API Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={16} className="text-neutral-500" />
                </div>
                <input 
                  type="password" 
                  value={resendApiKey}
                  onChange={e => setResendApiKey(e.target.value)}
                  placeholder={resendConfig.api_key ? '••••••••••••••••' : 're_xxxxxxxxxxxx'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Starts with <code className="text-neutral-400">re_</code>. Leave blank to keep existing key or use environment variable <code className="text-neutral-400">RESEND_API_KEY</code>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Sender Email Address</label>
              <input 
                type="text" 
                value={resendFromEmail}
                onChange={e => setResendFromEmail(e.target.value)}
                placeholder="QasiNet <onboarding@resend.dev>"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Default sandbox: <code className="text-neutral-400">QasiNet &lt;onboarding@resend.dev&gt;</code>. When your custom domain is verified in Resend, switch to <code className="text-neutral-400">QasiNet &lt;receipts@qasinet.com&gt;</code>.
              </p>
            </div>

            {/* Test Email Section */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Test Email Delivery
              </label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={testEmailRecipient}
                  onChange={e => setTestEmailRecipient(e.target.value)}
                  placeholder="Enter your email (e.g., admin@example.com)"
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestResendEmail}
                  disabled={isTesting || !testEmailRecipient.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send size={14} />
                  {isTesting ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>

            {resendTestResult && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${resendTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {resendTestResult.success ? <CheckCircle2 className="shrink-0" /> : <XCircle className="shrink-0" />}
                <div>
                  <h4 className="font-medium text-sm">{resendTestResult.success ? 'Delivery Verified' : 'Delivery Failed'}</h4>
                  <p className="text-xs mt-1 opacity-80">{resendTestResult.message}</p>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end border-t border-neutral-800">
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Email Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
