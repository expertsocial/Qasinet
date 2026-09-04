"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Trash2, 
  Smartphone, 
  Tv, 
  Zap, 
  Globe, 
  Droplet, 
  CreditCard,
  CheckCircle2, 
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Beneficiary, BeneficiaryType } from "@/lib/beneficiaries";
import { detectCarrier } from "@/lib/carrier";

export default function SavedBeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<BeneficiaryType>("phone");
  const [provider, setProvider] = useState("Safaricom");
  const [accountNumber, setAccountNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchBeneficiaries = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/user/beneficiaries", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBeneficiaries(data.beneficiaries || []);
      }
    } catch (err) {
      console.error("Failed to load beneficiaries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handlePhoneChange = (val: string) => {
    setAccountNumber(val);
    if (type === "phone") {
      const carrier = detectCarrier(val);
      if (carrier.name !== "UNKNOWN") {
        const titleCase = carrier.name.charAt(0) + carrier.name.slice(1).toLowerCase();
        setProvider(titleCase);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !accountNumber.trim()) {
      setErrorMsg("Please fill in both beneficiary name and account details.");
      return;
    }
    setErrorMsg("");
    try {
      setIsSaving(true);
      const res = await fetch("/api/user/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          provider: provider.trim(),
          accountNumber: accountNumber.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBeneficiaries(data.beneficiaries || []);
        setIsModalOpen(false);
        setName("");
        setAccountNumber("");
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || "Failed to save beneficiary");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/user/beneficiaries?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        setBeneficiaries(data.beneficiaries || []);
        setDeleteId(null);
      }
    } catch (err) {
      console.error("Failed to delete beneficiary:", err);
    }
  };

  const getIcon = (itemType: string) => {
    switch (itemType) {
      case "phone":
        return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case "electricity":
        return <Zap className="w-5 h-5 text-amber-500" />;
      case "tv":
        return <Tv className="w-5 h-5 text-purple-500" />;
      case "internet":
        return <Globe className="w-5 h-5 text-blue-500" />;
      case "water":
        return <Droplet className="w-5 h-5 text-cyan-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-primary" />;
    }
  };

  const getTopUpLink = (b: Beneficiary) => {
    switch (b.type) {
      case "phone":
        return `/services/airtime?phone=${encodeURIComponent(b.accountNumber)}`;
      case "electricity":
        return `/services/electricity?meter=${encodeURIComponent(b.accountNumber)}`;
      case "tv":
        return `/services/tv?account=${encodeURIComponent(b.accountNumber)}`;
      case "internet":
        return `/services/internet?account=${encodeURIComponent(b.accountNumber)}`;
      default:
        return `/services/airtime?phone=${encodeURIComponent(b.accountNumber)}`;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Beneficiaries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Store your family phone numbers, electricity meter tokens, and TV smartcards for 1-click checkout.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm font-medium">
          <Plus className="w-4 h-4" /> Add Beneficiary
        </Button>
      </div>

      {/* Grid of Beneficiaries */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3 bg-card border border-border rounded-2xl">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading saved beneficiaries...</p>
        </div>
      ) : beneficiaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {beneficiaries.map((b) => (
            <div 
              key={b.id} 
              className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                      {getIcon(b.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground truncate">{b.name}</h3>
                      <span className="text-xs font-medium text-muted-foreground">
                        {b.provider} • <span className="capitalize">{b.type}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteId(b.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors opacity-60 group-hover:opacity-100"
                    title="Delete beneficiary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground">Account / Number</div>
                  <div className="font-mono text-sm font-bold text-foreground mt-0.5 tracking-wide">
                    {b.accountNumber}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <Link href={getTopUpLink(b)} className="w-full">
                  <Button size="sm" variant="outline" className="w-full justify-center gap-1.5 h-8 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5 border-primary/20">
                    <CreditCard className="w-3.5 h-3.5" /> Top Up Now
                  </Button>
                </Link>
              </div>

              {/* Delete confirmation popup overlay */}
              {deleteId === b.id && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm p-4 flex flex-col justify-center items-center text-center animate-in fade-in z-10">
                  <p className="text-xs font-semibold mb-3 text-foreground">Remove "{b.name}" from saved list?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(b.id)} className="h-7 text-xs">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Card Slot */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[160px] group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-foreground">Add New Beneficiary</span>
            <span className="text-xs text-muted-foreground mt-0.5">Quick top-up recipient</span>
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground">No saved beneficiaries yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Save your phone number, friends, family contacts, or KPLC electricity meters to avoid typing them repeatedly during purchases.
            </p>
          </div>
          <div>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 font-medium shadow-sm">
              <Plus className="w-4 h-4" /> Add Your First Beneficiary
            </Button>
          </div>
        </div>
      )}

      {/* Add Beneficiary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Add New Beneficiary</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              
              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Service Type</label>
                <select 
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as BeneficiaryType;
                    setType(newType);
                    if (newType === "phone") setProvider("Safaricom");
                    else if (newType === "electricity") setProvider("KPLC");
                    else if (newType === "tv") setProvider("DStv");
                    else if (newType === "internet") setProvider("Zuku");
                  }}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="phone">Mobile Phone (Airtime & Data)</option>
                  <option value="electricity">Electricity (KPLC Prepaid / Postpaid)</option>
                  <option value="tv">TV Subscriptions (DStv, GOtv, StarTimes)</option>
                  <option value="internet">Internet & Fiber (Zuku, Faiba)</option>
                  <option value="water">Water Bill</option>
                </select>
              </div>

              {/* Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Provider / Network</label>
                <Input 
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g., Safaricom, Airtel, KPLC"
                  className="text-sm"
                />
              </div>

              {/* Friendly Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Beneficiary Nickname / Name</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Safaricom, Mum's Airtime, Home Meter"
                  className="text-sm"
                />
              </div>

              {/* Account Number / Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {type === "phone" ? "Phone Number" : "Account / Meter Number"}
                </label>
                <Input 
                  value={accountNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={type === "phone" ? "0712345678" : "e.g., 14123456789"}
                  className="text-sm font-mono"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Beneficiary
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
