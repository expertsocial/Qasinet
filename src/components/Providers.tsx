"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#111827',
              color: '#f3f4f6',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }} 
        />
        {children}
      </AuthProvider>
    </NextThemesProvider>
  );
}
