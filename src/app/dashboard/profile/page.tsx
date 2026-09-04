"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  UserCircle, 
  Shield, 
  Bell, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Mail,
  Smartphone,
  ShieldCheck
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [notificationsSMS, setNotificationsSMS] = useState(false);

  // Status states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoadingProfile(true);
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setFullName(data.user.fullName || "");
            setEmail(data.user.email || "");
            setPhone(data.user.phone || "");
            setNotificationsEmail(data.user.notificationsEmail ?? true);
            setNotificationsSMS(data.user.notificationsSMS ?? false);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg("");
    setProfileErrorMsg("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          notificationsEmail,
          notificationsSMS
        })
      });

      if (res.ok) {
        setProfileSuccessMsg("Profile details saved successfully.");
        setTimeout(() => setProfileSuccessMsg(""), 4000);
      } else {
        const errJson = await res.json();
        setProfileErrorMsg(errJson.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg("");
    setPasswordErrorMsg("");

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordErrorMsg(error.message);
      } else {
        setPasswordSuccessMsg("Your password has been updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setPasswordErrorMsg(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile & Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, email receipts, and login security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Personal info & Notifications */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-card border border-border shadow-sm rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <UserCircle className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Personal Information</h2>
            </div>

            {profileSuccessMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Full name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <Input 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal name"
                    className="text-sm font-medium"
                  />
                </div>

                {/* Phone number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Registered Phone Number</label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <Input 
                    value={phone}
                    disabled
                    className="text-sm font-mono bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">Primary identifier linked to M-Pesa vending.</p>
                </div>

                {/* Email address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="text-sm font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">Used for electronic receipts and order confirmations.</p>
                </div>

              </div>

              {/* Notification preferences */}
              <div className="pt-5 border-t border-border space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Notification Preferences</h3>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={notificationsEmail}
                      onChange={(e) => setNotificationsEmail(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Email Invoices & Transaction Receipts</p>
                      <p className="text-[11px] text-muted-foreground">Receive an instant PDF receipt and confirmation every time a transaction completes.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={notificationsSMS}
                      onChange={(e) => setNotificationsSMS(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">SMS Token Delivery Alerts</p>
                      <p className="text-[11px] text-muted-foreground">Receive token SMS directly to your phone for KPLC Prepaid power purchases.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button type="submit" disabled={isSavingProfile} className="gap-2 font-medium">
                  {isSavingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Profile Changes
                </Button>
              </div>

            </form>
          </div>

        </div>

        {/* Right Column: Password & Security */}
        <div className="space-y-6">
          
          <div className="bg-card border border-border shadow-sm rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <KeyRound className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Security & Password</h2>
            </div>

            {passwordSuccessMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                <Input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="text-sm"
                />
              </div>

              <Button 
                type="submit" 
                variant="outline" 
                disabled={isUpdatingPassword} 
                className="w-full justify-center gap-2 font-medium"
              >
                {isUpdatingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Update Password
              </Button>

            </form>
          </div>

          {/* Account Guarantee Card */}
          <div className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>QasiNet Account Protection</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your payments are processed directly through Safaricom Daraja M-Pesa API with instant automated token vending.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
