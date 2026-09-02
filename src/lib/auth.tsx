"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for mock session on mount
    const storedUser = localStorage.getItem("qnt_mock_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("qnt_mock_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (emailOrPhone: string, password: string) => {
    // Mock API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (password === "password123") {
          const mockUser: User = {
            id: "usr_" + Math.random().toString(36).substring(2, 9),
            fullName: "Jane Doe",
            email: emailOrPhone.includes("@") ? emailOrPhone : "jane@example.com",
            phone: emailOrPhone.includes("@") ? "0712345678" : emailOrPhone,
          };
          setUser(mockUser);
          localStorage.setItem("qnt_mock_user", JSON.stringify(mockUser));
          resolve();
        } else {
          reject(new Error("Invalid credentials. Try 'password123'."));
        }
      }, 1500);
    });
  };

  const register = async (data: any) => {
    // Mock API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: "usr_" + Math.random().toString(36).substring(2, 9),
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
        };
        setUser(mockUser);
        localStorage.setItem("qnt_mock_user", JSON.stringify(mockUser));
        resolve();
      }, 1500);
    });
  };

  const logout = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser(null);
        localStorage.removeItem("qnt_mock_user");
        router.push("/");
        resolve();
      }, 500);
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
