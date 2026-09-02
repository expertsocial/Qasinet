"use client";

import React, { useState } from "react";
import { submitSupportTicket } from "./actions";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function SupportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string | null }>({
    type: null,
    message: null,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: null });

    const formData = new FormData(event.currentTarget);
    const result = await submitSupportTicket(formData);

    if (result.success) {
      setStatus({ type: "success", message: "Your ticket has been submitted successfully! We'll be in touch soon." });
      (event.target as HTMLFormElement).reset();
    } else {
      setStatus({ type: "error", message: result.error || "An unexpected error occurred." });
    }
    
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {status.type === "success" && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-500 font-medium">{status.message}</p>
        </div>
      )}

      {status.type === "error" && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-500 font-medium">{status.message}</p>
        </div>
      )}

      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          placeholder="Briefly describe the issue"
        />
      </div>

      <div>
        <label htmlFor="transaction_id" className="block text-sm font-medium mb-1.5">
          Transaction Reference (Optional)
        </label>
        <input
          type="text"
          id="transaction_id"
          name="transaction_id"
          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          placeholder="e.g. QSN-2026..."
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
          placeholder="Provide as much detail as possible..."
        ></textarea>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Ticket"
        )}
      </Button>
    </form>
  );
}
