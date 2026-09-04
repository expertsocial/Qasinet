"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, X, ChevronDown, Smartphone, Wifi, Tv, Zap, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const serviceLinks = [
    { name: "Airtime", href: "/services/airtime", icon: Smartphone },
    { name: "Data", href: "/services/data", icon: Wifi },
    { name: "TV Subscription", href: "/services/tv", icon: Tv },
    { name: "Electricity", href: "/services/electricity", icon: Zap },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
        isScrolled
          ? "glass-panel border-border shadow-sm py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
            <Image
              src="/logos/qasinet-logo.jpeg"
              alt="QasiNet Logo"
              fill
              className="object-cover"
              sizes="40px"
              priority
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            Qasi<span className="text-primary">Net</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <div 
            className="relative"
            onMouseEnter={() => setServicesDropdownOpen(true)}
            onMouseLeave={() => setServicesDropdownOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              Services <ChevronDown className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
            <div className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 w-56 pt-2 transition-all duration-200 pointer-events-none opacity-0 translate-y-2",
              servicesDropdownOpen && "pointer-events-auto opacity-100 translate-y-0"
            )}>
              <div className="glass-panel rounded-xl shadow-premium-soft overflow-hidden flex flex-col p-1 border border-border">
                {serviceLinks.map((service) => (
                  <Link 
                    key={service.name}
                    href={service.href} 
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <service.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{service.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          <Link href="/track" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
            Track Transaction
          </Link>
          <Link href="/support" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
            Help
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
          
          {user ? (
            <div 
              className="relative"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <Button variant="ghost" className="font-medium gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <UserIcon className="w-3 h-3" />
                </div>
                {user.fullName.split(' ')[0]}
                <ChevronDown className="w-4 h-4" />
              </Button>
              
              <div className={cn(
                "absolute top-full right-0 w-48 pt-2 transition-all duration-200 pointer-events-none opacity-0 translate-y-2",
                userMenuOpen && "pointer-events-auto opacity-100 translate-y-0"
              )}>
                <div className="glass-panel rounded-xl shadow-premium-soft overflow-hidden flex flex-col p-1 border border-border">
                  {user.isAdmin && (
                    <Link 
                      href="/admin"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 font-semibold hover:bg-amber-500/10 rounded-lg transition-colors border-b border-border/50 mb-1"
                    >
                      <LayoutDashboard className="w-4 h-4 text-amber-400" />
                      Admin Panel
                    </Link>
                  )}
                  <Link 
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                    Dashboard
                  </Link>
                  <button 
                    onClick={() => logout()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" className="font-medium">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="font-medium">
                  Create Account
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-4">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full glass-panel border-b border-border p-4 flex flex-col gap-2 animate-slide-up shadow-premium-soft max-h-[80vh] overflow-y-auto">
          
          <div className="flex flex-col">
            <button 
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              className="flex items-center justify-between px-4 py-3 text-base font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
            >
              Services
              <ChevronDown className={cn("w-5 h-5 transition-transform", mobileServicesOpen && "rotate-180")} />
            </button>
            
            {mobileServicesOpen && (
              <div className="flex flex-col pl-4 border-l-2 border-primary/20 ml-6 mt-1 space-y-1 mb-2">
                {serviceLinks.map((service) => (
                  <Link 
                    key={service.name}
                    href={service.href} 
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <service.icon className="w-4 h-4" />
                    {service.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/track" className="px-4 py-3 text-base font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
            Track Transaction
          </Link>
          <Link href="/support" className="px-4 py-3 text-base font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
            Help
          </Link>
          
          <div className="h-px w-full bg-border my-4" />
          
          {user ? (
            <div className="flex flex-col gap-3 pb-2">
              {user.isAdmin && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2 border-amber-500/30 text-amber-400">
                    <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-2">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
