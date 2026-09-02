"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserCircle, Shield, Bell, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Mock form state based on user
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    notificationsEmail: true,
    notificationsSMS: false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <UserCircle className="w-5 h-5 text-primary" /> Personal Information
            </h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input 
                    value={formData.fullName} 
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled // Phone usually requires verification to change
                  />
                  <p className="text-xs text-muted-foreground">Contact support to change your verified phone number.</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <h2 className="text-lg font-semibold flex items-center gap-2 pt-4 mb-4 border-t border-border mt-8">
                <Bell className="w-5 h-5 text-primary" /> Notifications
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    checked={formData.notificationsEmail}
                    onChange={(e) => setFormData({...formData, notificationsEmail: e.target.checked})}
                  />
                  <div>
                    <p className="font-medium text-sm">Email Receipts</p>
                    <p className="text-xs text-muted-foreground">Receive transaction receipts via email.</p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    checked={formData.notificationsSMS}
                    onChange={(e) => setFormData({...formData, notificationsSMS: e.target.checked})}
                  />
                  <div>
                    <p className="font-medium text-sm">SMS Alerts (Premium)</p>
                    <p className="text-xs text-muted-foreground">Receive important alerts via SMS.</p>
                  </div>
                </label>
              </div>

              <div className="pt-6 border-t border-border flex items-center justify-between">
                {isSaved ? (
                  <span className="text-sm font-medium text-green-500">Settings saved successfully!</span>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" /> Security
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Password</p>
                <p className="text-xs text-muted-foreground mb-3">Update your password regularly to keep your account secure.</p>
                <Button variant="outline" className="w-full text-sm">Change Password</Button>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium mb-1 text-destructive">Danger Zone</p>
                <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all data.</p>
                <Button variant="outline" className="w-full text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20 hover:border-destructive">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
