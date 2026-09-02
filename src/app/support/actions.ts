"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitSupportTicket(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be logged in to submit a ticket." };
  }

  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const transactionId = formData.get("transaction_id") as string | null;

  if (!subject || !description) {
    return { success: false, error: "Subject and description are required." };
  }

  const payload: any = {
    user_id: user.id,
    subject,
    description,
  };

  if (transactionId) {
    // Verify that the transaction belongs to the user and lookup the UUID by the user-facing QSN reference
    const { data: tx } = await supabase
      .from("transactions")
      .select("id")
      .eq("qsn_reference", transactionId)
      .eq("user_id", user.id)
      .single();
      
    if (tx) {
      payload.transaction_id = tx.id;
    }
  }

  const { error } = await supabase.from("support_tickets").insert(payload);

  if (error) {
    console.error("Failed to submit ticket:", error);
    return { success: false, error: "Failed to submit support ticket. Please try again later." };
  }

  return { success: true };
}
