'use client';

import { useState } from 'react';
import { saveSettingsAction, testKyandaConnectionAction, testResendConnectionAction } from './actions';
import { 
  Save, Server, Globe, Key, Link as LinkIcon, CheckCircle2, XCircle, Mail, Send, 
  ExternalLink, User, ShieldCheck, Lock, Smartphone, AlertTriangle, RefreshCw, X, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface AdminProfileData {
  id: string;
  email: string;
  phone: string;
  fullName: string;
}

export default function SettingsFormClient({ 
  adminProfile, 
  generalConfig, 
  kyandaConfig, 
  resendConfig = {} 
}: {
  adminProfile?: AdminProfileData | null;
  generalConfig: any;
  kyandaConfig: any;
  resendConfig?: any;
}) {
  const [activeTab, setActiveTab] = useState<'account' | 'general' | 'kyanda' | 'resend'>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Admin Account & Profile State
  const [adminEmail, setAdminEmail] = useState(adminProfile?.email || '');
  const [adminFullName, setAdminFullName] = useState(adminProfile?.fullName || '');
  const [adminPhone, setAdminPhone] = useState(adminProfile?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Admin Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Admin Email Change 2-Step Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalStep, setEmailModalStep] = useState<1 | 2>(1);
  const [emailModalCurrentPassword, setEmailModalCurrentPassword] = useState('');
  const [emailModalNewEmail, setEmailModalNewEmail] = useState('');
  const [emailModalOtp, setEmailModalOtp] = useState('');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailModalError, setEmailModalError] = useState('');

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

  // Password strength checker helper
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // --- Handlers: Admin Account Management ---
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: adminFullName,
          phone: adminPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      toast.success('Admin profile saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!isPasswordStrong) {
      toast.error('Please fulfill all password strength requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success(data.message || 'Password updated successfully! Other sessions revoked.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Error updating password');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRequestEmailOTP(e: React.FormEvent) {
    e.preventDefault();
    setEmailModalError('');
    if (!emailModalCurrentPassword) {
      setEmailModalError('Current password is required to verify your identity.');
      return;
    }
    const cleanNewEmail = emailModalNewEmail.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
      setEmailModalError('Please enter a valid new email address.');
      return;
    }
    if (cleanNewEmail === adminEmail.toLowerCase().trim()) {
      setEmailModalError('New email must be different from the current email.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const res = await fetch('/api/admin/profile/email/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: cleanNewEmail,
          currentPassword: emailModalCurrentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      toast.success(`Verification code sent to ${cleanNewEmail}`);
      setEmailModalStep(2);
    } catch (err: any) {
      setEmailModalError(err.message || 'Failed to request verification code');
    } finally {
      setIsSendingEmailOtp(false);
    }
  }

  async function handleVerifyEmailOTP(e: React.FormEvent) {
    e.preventDefault();
    setEmailModalError('');
    const cleanCode = emailModalOtp.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      setEmailModalError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifyingEmailOtp(true);
    try {
      const cleanNewEmail = emailModalNewEmail.trim().toLowerCase();
      const res = await fetch('/api/admin/profile/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: cleanNewEmail,
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      // Refresh client session to prevent stale token logout
      try {
        const supabase = createClient();
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        console.warn('Session refresh warning:', refreshErr);
      }

      setAdminEmail(cleanNewEmail);
      toast.success(`Admin email successfully changed to ${cleanNewEmail}`);
      setIsEmailModalOpen(false);
      setEmailModalStep(1);
      setEmailModalCurrentPassword('');
      setEmailModalNewEmail('');
      setEmailModalOtp('');
    } catch (err: any) {
      setEmailModalError(err.message || 'Verification failed');
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  }

  // --- Handlers: System Integrations ---
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
      toast.error('Please enter a recipient email address');
      return;
    }
    setIsTesting(true);
    setResendTestResult(null);
    const effectiveKey = resendApiKey.trim() || resendConfig.api_key || '';
    
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
      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'account' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
          }`}
        >
          <ShieldCheck size={18} />
          Admin Account & Security
        </button>
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
        {/* --- TAB 1: ADMIN ACCOUNT & SECURITY --- */}
        {activeTab === 'account' && (
          <div className="space-y-8 max-w-2xl">
            {/* Section A: Profile & Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <User className="text-blue-400 w-5 h-5" />
                <h2 className="text-base font-semibold text-white">Administrator Profile & Contact</h2>
              </div>

              {/* Email Display & Change Action */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Primary Admin Email</div>
                  <div className="text-sm font-medium text-white mt-1 flex items-center gap-2">
                    <span>{adminEmail || 'No email associated'}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Primary
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Used for administrative sign-in and critical security alerts.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailModalError('');
                    setEmailModalStep(1);
                    setEmailModalCurrentPassword('');
                    setEmailModalNewEmail('');
                    setEmailModalOtp('');
                    setIsEmailModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Mail size={14} />
                  Change Admin Email
                </button>
              </div>

              {/* Editable Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="e.g. George Sanare"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-neutral-400" />
                    Admin Phone Number
                  </label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="e.g. 254700000000 or +254712345678"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Editable contact number for administrative alerts and SMS fallback.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Section B: Password Change & Session Invalidation */}
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <Lock className="text-blue-400 w-5 h-5" />
                <h2 className="text-base font-semibold text-white">Change Admin Password</h2>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <strong>Session Security:</strong> Updating your password will instantly invalidate all other active sessions and tokens across any other devices or browsers.
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300"
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">New Password</label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Confirm New Password</label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Strength Checklist */}
                {newPassword.length > 0 && (
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1.5 text-xs">
                    <div className="font-semibold text-neutral-400 mb-1">Password Requirements:</div>
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-neutral-500'}`}>
                      {hasMinLength ? '✓' : '○'} At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : 'text-neutral-500'}`}>
                      {hasUppercase ? '✓' : '○'} One uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-400' : 'text-neutral-500'}`}>
                      {hasLowercase ? '✓' : '○'} One lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-neutral-500'}`}>
                      {hasNumber ? '✓' : '○'} One number (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-neutral-500'}`}>
                      {hasSpecial ? '✓' : '○'} One special character (!@#$%...)
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !isPasswordStrong || newPassword !== confirmPassword || !currentPassword}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Key size={16} />
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- 2-STEP MODAL: SECURE EMAIL CHANGE --- */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Step {emailModalStep} of 2
                </div>
                <h3 className="text-lg font-bold text-white">
                  {emailModalStep === 1 ? 'Change Administrator Email' : 'Enter Verification Code'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {emailModalStep === 1
                    ? 'Verify your current password and specify the new email address.'
                    : `We sent a 6-digit verification code to ${emailModalNewEmail}.`}
                </p>
              </div>

              {emailModalError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{emailModalError}</span>
                </div>
              )}

              {/* Step 1: Re-authenticate and provide new email */}
              {emailModalStep === 1 && (
                <form onSubmit={handleRequestEmailOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Current Password (Re-authentication)</label>
                    <input
                      type="password"
                      value={emailModalCurrentPassword}
                      onChange={(e) => setEmailModalCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">New Administrator Email</label>
                    <input
                      type="email"
                      value={emailModalNewEmail}
                      onChange={(e) => setEmailModalNewEmail(e.target.value)}
                      placeholder="e.g. qasinetltd@gmail.com"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      A 6-digit code will be sent to this inbox to prove ownership before the account is updated.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEmailModalOpen(false)}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingEmailOtp || !emailModalCurrentPassword || !emailModalNewEmail}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSendingEmailOtp && <RefreshCw size={14} className="animate-spin" />}
                      {isSendingEmailOtp ? 'Sending Code...' : 'Send Verification Code'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: 6-Digit OTP Verification */}
              {emailModalStep === 2 && (
                <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailModalOtp}
                      onChange={(e) => setEmailModalOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest text-blue-400 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-neutral-500 mt-1 text-center">
                      Code is valid for 15 minutes. Single use only.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setEmailModalStep(1)}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      ← Back / Change Email
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEmailModalOpen(false)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifyingEmailOtp || emailModalOtp.length !== 6}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isVerifyingEmailOtp && <RefreshCw size={14} className="animate-spin" />}
                        {isVerifyingEmailOtp ? 'Verifying...' : 'Confirm & Update Email'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: GENERAL SETTINGS --- */}
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

        {/* --- TAB 3: KYANDA INTEGRATION --- */}
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

        {/* --- TAB 4: EMAIL SERVICE (RESEND) --- */}
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
