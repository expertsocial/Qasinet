"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

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

      const userIsAdmin = !!adminRecord;
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
    const email = data.email?.trim() || `${data.phone.replace(/\D/g, "")}@qasinet.app`;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
        },
      },
    });

    if (signUpError) {
      throw new Error(signUpError.message || "Failed to create account.");
    }

    if (authData.user) {
      // Upsert profile
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
      });

      await fetchProfileAndAdminStatus(authData.user);
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
