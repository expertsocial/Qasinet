"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { isAuthorizedAdminEmail } from "@/lib/auth/admin-check";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: { fullName: string; phone: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfileAndAdminStatus = async (sbUser: SupabaseUser | null) => {
    if (!sbUser) {
      setUser(null);
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .single();

      // Check Admin
      const { data: adminRecord } = await supabase
        .from("admins")
        .select("id")
        .eq("id", sbUser.id)
        .single();

      const userIsAdmin = isAuthorizedAdminEmail(sbUser.email);

      setIsAdmin(userIsAdmin);

      setUser({
        id: sbUser.id,
        fullName: profile?.full_name || sbUser.user_metadata?.full_name || sbUser.email?.split("@")[0] || "User",
        email: sbUser.email || profile?.email || "",
        phone: profile?.phone || sbUser.user_metadata?.phone || "",
        isAdmin: userIsAdmin,
      });
    } catch (e) {
      console.error("Error fetching user profile:", e);
      setUser({
        id: sbUser.id,
        fullName: sbUser.email?.split("@")[0] || "User",
        email: sbUser.email || "",
        phone: "",
        isAdmin: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial session load
    supabase.auth.getUser().then(({ data: { user: sbUser } }) => {
      fetchProfileAndAdminStatus(sbUser);
    });

    // 2. Listen to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfileAndAdminStatus(session.user);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (emailOrPhone: string, password: string) => {
    let email = emailOrPhone.trim();

    // If identifier is a phone number without @, look up email
    if (!email.includes("@")) {
      const formattedPhone = email.replace(/\D/g, "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", formattedPhone)
        .single();

      if (profile?.email) {
        email = profile.email;
      } else {
        // Try Kenyan 254 prefix format
        const kenyanPhone = formattedPhone.startsWith("0") ? "254" + formattedPhone.slice(1) : formattedPhone;
        const { data: profile2 } = await supabase
          .from("profiles")
          .select("email")
          .eq("phone", kenyanPhone)
          .single();

        if (profile2?.email) {
          email = profile2.email;
        } else {
          throw new Error("No account found with this phone number. Please enter your email.");
        }
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || "Invalid credentials. Please check your email and password.");
    }

    if (data.user) {
      await fetchProfileAndAdminStatus(data.user);
    }
  };

  const register = async (data: { fullName: string; phone: string; email?: string; password: string }) => {
    if (!data.email || !data.email.includes("@")) {
      throw new Error("A valid email address is required to register.");
    }
    const email = data.email.trim().toLowerCase();

    // Call server-side registration API (creates account with auto-confirm, zero OTP)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: data.fullName,
        phone: data.phone,
        email,
        password: data.password,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || "Failed to create account. Please try again.");
    }

    // Immediately sign in with password to establish session in browser
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (signInError) {
      throw new Error(signInError.message || "Account created, but sign in failed. Please log in.");
    }

    if (signInData.user) {
      await fetchProfileAndAdminStatus(signInData.user);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
