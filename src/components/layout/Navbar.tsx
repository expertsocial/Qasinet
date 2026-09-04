"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  Moon, 
  Sun, 
  Menu, 
  X, 
  ChevronDown, 
  Smartphone, 
  Wifi, 
  Tv, 
  Zap, 
  Droplets, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard,
  ShieldCheck,
  Search,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  // Close menus on route change
  useEffect(() => {
    setServicesDropdownOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click outside to dismiss dropdowns
  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const serviceLinks = [
    { 
      name: "Airtime Top-Up", 
      desc: "Safaricom, Airtel, Telkom & Equitel", 
      href: "/services/airtime", 
      icon: Smartphone,
      badge: "Instant"
    },
    { 
      name: "Data Bundles", 
      desc: "Daily, weekly & monthly high-speed", 
      href: "/services/data", 
      icon: Wifi,
      badge: "Best Value"
    },
    { 
      name: "Electricity Tokens", 
      desc: "KPLC Prepaid & Postpaid meters", 
      href: "/services/electricity", 
      icon: Zap,
      badge: "24/7"
    },
    { 
      name: "TV Subscriptions", 
      desc: "DStv, GOtv, Zuku & StarTimes", 
      href: "/services/tv", 
      icon: Tv,
      badge: "Direct"
    },
    { 
      name: "Water Utility", 
      desc: "Nairobi Water & local meters", 
      href: "/services/water", 
      icon: Droplets,
      badge: "Zero Fee"
    },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled
          ? "glass-panel border-b border-border shadow-sm py-3"
          : "bg-background/80 backdrop-blur-md border-b border-border/40 py-4"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 overflow-hidden rounded-xl shadow-sm group-hover:scale-105 transition-all border border-border/50">
            <Image
              src="/logos/qasinet-logo.jpeg"
              alt="QasiNet Logo"
              fill
              className="object-cover"
              sizes="36px"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-foreground flex items-center gap-1 leading-none">
              Qasi<span className="text-primary">Net</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              Digital Utilities
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-3 bg-muted/40 p-1 rounded-full border border-border/60">
          
          {/* Isolated Services Dropdown */}
          <div 
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setServicesDropdownOpen(true)}
            onMouseLeave={() => setServicesDropdownOpen(false)}
          >
            <button 
              onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all",
                servicesDropdownOpen || pathname.startsWith("/services")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Services</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", servicesDropdownOpen && "rotate-180")} />
            </button>
            
            {/* High-End Non-Interfering Overlay Menu */}
            <div 
              className={cn(
                "absolute top-full left-0 w-80 pt-3 transition-all duration-200 z-[60]",
                servicesDropdownOpen 
                  ? "opacity-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 -translate-y-2 pointer-events-none"
              )}
            >
              <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden p-2 border border-border/80 divide-y divide-border/30">
                <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Service Launcher
                </div>
                <div className="pt-1.5 space-y-1">
                  {serviceLinks.map((service) => (
                    <Link 
                      key={service.name}
                      href={service.href} 
                      onClick={() => setServicesDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                        <service.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs truncate text-foreground group-hover:text-primary">{service.name}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary shrink-0">
                            {service.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{service.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="p-2 pt-2 bg-muted/30">
                  <Link 
                    href="/services" 
                    onClick={() => setServicesDropdownOpen(false)}
                    className="block text-center text-xs font-semibold text-primary hover:underline py-1"
                  >
                    View All Services Directory →
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          <Link 
            href="/track" 
            className={cn(
              "px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all",
              pathname === "/track" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            Track Status
          </Link>

          <Link 
            href="/support" 
            className={cn(
              "px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all",
              pathname === "/support" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            Support
          </Link>
        </nav>

        {/* Right Action Icons & User Account */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Theme Toggle (Light <-> Dark) */}
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full w-9 h-9 border-border/80 hover:bg-muted"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-90 duration-300" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 animate-in spin-in-90 duration-300" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
          
          {user ? (
            <div 
              ref={userMenuRef}
              className="relative"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="rounded-full font-semibold gap-2 border-border/80 pl-2 pr-3 h-9 shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {user.fullName ? user.fullName[0].toUpperCase() : "U"}
                </div>
                <span className="text-xs max-w-[90px] truncate">{user.fullName.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
              
              <div className={cn(
                "absolute top-full right-0 w-52 pt-2 transition-all duration-200 z-[60]",
                userMenuOpen 
                  ? "opacity-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 -translate-y-2 pointer-events-none"
              )}>
                <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden p-1.5 border border-border space-y-1">
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-xs font-bold text-foreground truncate">{user.fullName}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{user.phone || user.email}</p>
                  </div>

                  {user.isAdmin && (
                    <Link 
                      href="/admin"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-amber-400 font-bold hover:bg-amber-500/10 rounded-xl transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-amber-400" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link 
                    href="/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground font-semibold hover:bg-muted rounded-xl transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                    User Dashboard
                  </Link>
                  <button 
                    onClick={() => logout()}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-destructive font-semibold hover:bg-destructive/10 rounded-xl transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-xs font-semibold rounded-full px-3.5 h-8">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="text-xs font-semibold rounded-full px-4 h-8 shadow-sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Action Trigger */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full w-9 h-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl w-9 h-9 border-border"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[65px] bg-background/95 backdrop-blur-2xl border-b border-border p-5 flex flex-col gap-3 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto z-50">
          
          {/* Services Group */}
          <div className="border border-border/60 rounded-2xl p-2 bg-card/60">
            <button 
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-foreground w-full text-left"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Digital Services
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", mobileServicesOpen && "rotate-180")} />
            </button>
            
            {mobileServicesOpen && (
              <div className="pt-2 pb-1 space-y-1 border-t border-border/40 mt-1">
                {serviceLinks.map((service) => (
                  <Link 
                    key={service.name}
                    href={service.href} 
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-muted text-foreground transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <service.icon className="w-4 h-4 text-primary" />
                    <span>{service.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link 
            href="/track" 
            className="px-4 py-3 text-sm font-semibold rounded-2xl bg-card border border-border/60 hover:bg-muted text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Track Transaction Status
          </Link>
          <Link 
            href="/support" 
            className="px-4 py-3 text-sm font-semibold rounded-2xl bg-card border border-border/60 hover:bg-muted text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Help & Customer Support
          </Link>
          
          <div className="h-px w-full bg-border my-2" />
          
          {user ? (
            <div className="flex flex-col gap-2">
              {user.isAdmin && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2 border-amber-500/30 text-amber-400 rounded-xl">
                    <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2 rounded-xl">
                  <LayoutDashboard className="w-4 h-4" />
                  My Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center rounded-xl text-xs font-semibold">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center rounded-xl text-xs font-semibold">
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
