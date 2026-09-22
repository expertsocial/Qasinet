"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  EyeOff, 
  Eye, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Search,
  Filter,
  X,
  ChevronRight,
  ArrowLeft,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export interface ManagedService {
  id: string;
  title: string;
  shortName: string;
  category: string;
  categoryLabel: string;
  logoSrc: string;
  badge?: string;
  status: "enabled" | "locked" | "hidden";
  rawStaticStatus: string;
  reason: string | null;
  customerMessage: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  updatedAt: string | null;
}

import { ServiceAuditEntry } from "@/lib/services/service-lock";

export type AuditRecord = ServiceAuditEntry;

interface Props {
  initialServices: ManagedService[];
  initialAuditLog: AuditRecord[];
}

export function ServiceControlClient({ initialServices, initialAuditLog }: Props) {
  const [services, setServices] = useState<ManagedService[]>(initialServices);
  const [auditLog, setAuditLog] = useState<AuditRecord[]>(initialAuditLog);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<ManagedService | null>(null);
  const [targetStatus, setTargetStatus] = useState<"enabled" | "locked" | "hidden">("locked");
  const [reason, setReason] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tab state: "services" vs "audit"
  const [activeTab, setActiveTab] = useState<"services" | "audit">("services");

  // Counts
  const totalCount = services.length;
  const activeCount = services.filter((s) => s.status === "enabled").length;
  const lockedCount = services.filter((s) => s.status === "locked").length;
  const hiddenCount = services.filter((s) => s.status === "hidden").length;

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/services/control");
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
        setAuditLog(data.auditLog);
        toast.success("Live status refreshed", {
          style: { background: "#18181b", color: "#f4f4f5", borderRadius: "12px" }
        });
      } else {
        toast.error(data.error || "Failed to fetch service status");
      }
    } catch {
      toast.error("Network error while refreshing service status");
    } finally {
      setRefreshing(false);
    }
  };

  const openActionModal = (service: ManagedService, newStatus: "enabled" | "locked" | "hidden") => {
    setActiveService(service);
    setTargetStatus(newStatus);
    setReason("");
    setReasonError("");
    
    // Suggest default customer notice if locking
    if (newStatus === "locked") {
      setCustomerMessage(
        service.customerMessage || 
        `${service.title} is temporarily paused for maintenance. Please check back shortly.`
      );
    } else {
      setCustomerMessage("");
    }
    setModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setReasonError("Mandatory reason required (at least 3 characters).");
      return;
    }

    setSubmitting(true);
    setReasonError("");

    try {
      const res = await fetch("/api/admin/services/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: activeService.id,
          status: targetStatus,
          reason: trimmedReason,
          customerMessage: customerMessage.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update service");
      }

      toast.success(
        `${activeService.title} is now ${targetStatus.toUpperCase()}`,
        { style: { background: "#18181b", color: "#f4f4f5", borderRadius: "12px" } }
      );

      setModalOpen(false);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update service");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered services
  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    const matchesSearch = 
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-1">
            <Link href="/admin/services" className="hover:text-emerald-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Services Hub
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Live Service Control & Killswitch
                <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Instant DB Toggle
                </span>
              </h1>
              <p className="text-neutral-400 text-xs sm:text-sm">
                Pause, lock, or hide any utility service across the live site instantly without code changes or redeployments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-amber-400")} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs text-neutral-400 font-medium">Total Registered</span>
          <div className="text-2xl font-black text-white mt-1">{totalCount}</div>
          <span className="text-[11px] text-neutral-500">Static master registry</span>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active & Vending
          </span>
          <div className="text-2xl font-black text-white mt-1">{activeCount}</div>
          <span className="text-[11px] text-neutral-500">Accepting checkouts</span>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Locked by Admin
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">{lockedCount}</div>
          <span className="text-[11px] text-neutral-500">Blocked at choke point</span>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" /> Hidden from Catalog
          </span>
          <div className="text-2xl font-black text-neutral-300 mt-1">{hiddenCount}</div>
          <span className="text-[11px] text-neutral-500">Unlisted from UI</span>
        </div>
      </div>

      {/* Navigation Tabs (Services vs Audit Log) */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab("services")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "services"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-900"
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Live Service Toggles ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "audit"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-900"
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log Trail ({auditLog.length})</span>
        </button>
      </div>

      {activeTab === "services" ? (
        <div className="space-y-4">
          {/* Controls Bar: Search + Category + Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/70 border border-neutral-800/80 p-3 rounded-2xl">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services by name or slug..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Dropdown/Pills */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                <option value="airtime">Airtime</option>
                <option value="data">Data Bundles</option>
                <option value="electricity">Electricity</option>
                <option value="tv">TV Subscriptions</option>
                <option value="water">Water</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="enabled">Active Only</option>
                <option value="locked">Locked Only</option>
                <option value="hidden">Hidden Only</option>
              </select>
            </div>
          </div>

          {/* Services Table */}
          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Live State</th>
                    <th className="px-5 py-4">Reason / Notes</th>
                    <th className="px-5 py-4">Customer Notice</th>
                    <th className="px-5 py-4 text-right">Instant Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-xs text-neutral-500">
                        No services match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((service) => {
                      const isLocked = service.status === "locked";
                      const isHidden = service.status === "hidden";
                      const isEnabled = service.status === "enabled";

                      return (
                        <tr key={service.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white p-1 border border-neutral-700/50 flex items-center justify-center shrink-0">
                                <Image
                                  src={service.logoSrc}
                                  alt={service.title}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                />
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {service.title}
                                  {service.badge && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-normal">
                                      {service.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-neutral-500">{service.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700/40">
                              {service.categoryLabel}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {isEnabled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                ACTIVE
                              </span>
                            )}
                            {isLocked && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Lock className="w-3 h-3" />
                                LOCKED
                              </span>
                            )}
                            {isHidden && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                                <EyeOff className="w-3 h-3" />
                                HIDDEN
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 max-w-xs">
                            {service.reason ? (
                              <div className="space-y-0.5">
                                <p className="text-xs text-neutral-200 line-clamp-2">{service.reason}</p>
                                {service.lockedBy && (
                                  <p className="text-[10px] text-neutral-500 font-mono">
                                    By {service.lockedBy}
                                    {service.updatedAt ? ` • ${new Date(service.updatedAt).toLocaleDateString()}` : ""}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-neutral-600 italic">No notes</span>
                            )}
                          </td>

                          <td className="px-5 py-4 max-w-xs">
                            {service.customerMessage ? (
                              <p className="text-xs text-amber-300/80 italic line-clamp-2">
                                &quot;{service.customerMessage}&quot;
                              </p>
                            ) : (
                              <span className="text-xs text-neutral-600 italic">Standard notice</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {isEnabled ? (
                                <>
                                  <button
                                    onClick={() => openActionModal(service, "locked")}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>Lock</span>
                                  </button>
                                  <button
                                    onClick={() => openActionModal(service, "hidden")}
                                    className="px-2 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1 transition-all"
                                    title="Hide from catalog"
                                  >
                                    <EyeOff className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openActionModal(service, "enabled")}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                                  >
                                    <Unlock className="w-3 h-3" />
                                    <span>Enable</span>
                                  </button>
                                  {isLocked ? (
                                    <button
                                      onClick={() => openActionModal(service, "hidden")}
                                      className="px-2 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs font-medium transition-all"
                                      title="Hide instead"
                                    >
                                      <EyeOff className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openActionModal(service, "locked")}
                                      className="px-2 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-all"
                                      title="Lock instead"
                                    >
                                      <Lock className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Trail Tab */
        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Service Status Audit Trail
              </h2>
              <p className="text-xs text-neutral-400">Chronological history of who changed which service, when, and why.</p>
            </div>
            <span className="text-xs text-neutral-500 font-mono">{auditLog.length} Events recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Timestamp (EAT)</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Transition</th>
                  <th className="px-5 py-3">Mandatory Reason</th>
                  <th className="px-5 py-3">Customer Notice</th>
                  <th className="px-5 py-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {auditLog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-neutral-500">
                      No status transitions recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLog.map((log) => {
                    const matched = services.find((s) => s.id === log.service_id);
                    const formattedDate = new Date(log.created_at).toLocaleString("en-KE", {
                      timeZone: "Africa/Nairobi",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={log.id} className="hover:bg-neutral-800/30 text-xs">
                        <td className="px-5 py-3 font-mono text-neutral-400 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3 font-bold text-white whitespace-nowrap">
                          {matched?.title || log.service_id}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-mono uppercase">
                            <span className="text-neutral-500">{log.old_status || "default"}</span>
                            <ChevronRight className="w-3 h-3 text-neutral-600" />
                            <span className={cn(
                              "font-bold px-2 py-0.5 rounded",
                              log.new_status === "enabled" && "bg-emerald-500/10 text-emerald-400",
                              log.new_status === "locked" && "bg-amber-500/10 text-amber-400",
                              log.new_status === "hidden" && "bg-neutral-800 text-neutral-400"
                            )}>
                              {log.new_status}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-neutral-300 max-w-sm">
                          {log.reason}
                        </td>
                        <td className="px-5 py-3 text-neutral-400 italic max-w-xs">
                          {log.customer_message ? `"${log.customer_message}"` : "—"}
                        </td>
                        <td className="px-5 py-3 font-mono text-neutral-400 whitespace-nowrap">
                          {log.changed_by || "System"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Modal (Lock / Unlock / Hide) */}
      {modalOpen && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center",
                  targetStatus === "locked" && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                  targetStatus === "enabled" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
                  targetStatus === "hidden" && "bg-neutral-800 text-neutral-400 border border-neutral-700"
                )}>
                  {targetStatus === "locked" ? <Lock className="w-5 h-5" /> : targetStatus === "enabled" ? <Unlock className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {targetStatus === "locked" ? "Lock Service" : targetStatus === "enabled" ? "Enable Service" : "Hide Service"}
                  </h3>
                  <p className="text-xs text-neutral-400">{activeService.title} ({activeService.id})</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Target State</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetStatus("enabled")}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                    targetStatus === "enabled"
                      ? "bg-emerald-500 text-neutral-950 border-emerald-400 shadow-sm"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  )}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Enabled</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetStatus("locked")}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                    targetStatus === "locked"
                      ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-sm"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetStatus("hidden")}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                    targetStatus === "hidden"
                      ? "bg-neutral-200 text-neutral-950 border-white shadow-sm"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  )}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hidden</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStatus} className="space-y-4">
              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                    <span>Mandatory Reason</span>
                    <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-neutral-500">Recorded in audit trail</span>
                </div>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError("");
                  }}
                  placeholder={
                    targetStatus === "locked"
                      ? "e.g. Awaiting production API credentials, or upstream downtime"
                      : "e.g. Credentials provisioned and gateway testing verified"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                {reasonError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {reasonError}
                  </p>
                )}
              </div>

              {/* Customer-Facing Notice (Optional, highly recommended for locked) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">Customer Notice (Optional)</label>
                  <span className="text-[10px] text-neutral-500">Displayed in toast / card</span>
                </div>
                <textarea
                  rows={2}
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  placeholder="e.g. Service is temporarily paused for maintenance. Please check back in a few minutes."
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Alert notice */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-400">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  An email notification will be dispatched automatically to <span className="text-neutral-200 font-mono">qasinetltd@gmail.com</span>. The in-memory cache will invalidate immediately.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2",
                    targetStatus === "locked" && "bg-amber-500 hover:bg-amber-400 text-neutral-950",
                    targetStatus === "enabled" && "bg-emerald-500 hover:bg-emerald-400 text-neutral-950",
                    targetStatus === "hidden" && "bg-neutral-200 hover:bg-white text-neutral-950"
                  )}
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Apply State Change</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
