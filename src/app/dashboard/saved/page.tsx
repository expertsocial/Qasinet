"use client";

import React, { useState } from "react";
import { Trash2, Smartphone, Tv, Zap, Droplet } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Beneficiary = {
  id: string;
  name: string;
  type: "Phone" | "TV" | "Electricity" | "Water";
  value: string;
};

const initialBeneficiaries: Beneficiary[] = [
  { id: "b1", name: "My Safaricom", type: "Phone", value: "0712 345 678" },
  { id: "b2", name: "Home DStv", type: "TV", value: "1029384756" },
  { id: "b3", name: "Aunt's KPLC", type: "Electricity", value: "11223344556" },
];

export default function SavedDetailsPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteConfirm = (id: string) => {
    setBeneficiaries(beneficiaries.filter(b => b.id !== id));
    setDeleteId(null);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case "Phone": return <Smartphone className="w-5 h-5" />;
      case "TV": return <Tv className="w-5 h-5" />;
      case "Electricity": return <Zap className="w-5 h-5" />;
      case "Water": return <Droplet className="w-5 h-5" />;
      default: return <Smartphone className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved Beneficiaries</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your saved phone numbers and account details for faster checkout.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {beneficiaries.map((beneficiary) => (
          <div key={beneficiary.id} className="bg-card border border-border shadow-sm rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                {getIcon(beneficiary.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{beneficiary.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{beneficiary.type}</p>
                <p className="text-sm font-mono mt-1 text-foreground">{beneficiary.value}</p>
              </div>
            </div>
            
            {/* Delete Confirmation Overlay */}
            {deleteId === beneficiary.id ? (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-sm p-4 flex flex-col justify-center items-center text-center animate-in fade-in">
                <p className="text-sm font-medium mb-3">Delete this beneficiary?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirm(beneficiary.id)}>Delete</Button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setDeleteId(beneficiary.id)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* Add New Placeholder */}
        <div className="bg-transparent border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors min-h-[140px]">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <span className="text-xl leading-none font-medium">+</span>
          </div>
          <h3 className="font-medium text-foreground">Add New</h3>
          <p className="text-xs text-muted-foreground">Save a new number or account</p>
        </div>
      </div>

    </div>
  );
}
