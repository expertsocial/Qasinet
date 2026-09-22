import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MASTER_SERVICES, getServiceStatus, ServiceStatus } from './registry';
import { sendAdminServiceLockAlertEmail } from './email';

export type ServiceLockStatus = 'enabled' | 'locked' | 'hidden';

export interface LiveServiceStatus {
  serviceId: string;
  status: ServiceLockStatus;
  reason: string;
  customerFacingMessage?: string;
  customerMessage?: string;
  lockedBy?: string;
  lockedAt?: string;
  isFallback: boolean;
  updatedAt?: string;
  isLocked: boolean;
  title: string;
}

export interface ServiceAuditEntry {
  id: string;
  serviceId: string;
  service_id: string;
  serviceTitle?: string;
  action: 'LOCK' | 'UNLOCK' | 'STATUS_CHANGE';
  status: ServiceLockStatus;
  reason: string;
  customerFacingMessage?: string;
  customerMessage?: string;
  adminId?: string;
  adminEmail?: string;
  changedBy?: string;
  createdAt: string;
  created_at: string;
  old_status?: string | null;
  new_status?: string;
  customer_message?: string | null;
  changed_by?: string | null;
}

export interface SetServiceStatusParams {
  serviceId?: string;
  serviceSlug?: string;
  status: ServiceLockStatus;
  reason: string;
  customerFacingMessage?: string;
  customerMessage?: string;
  adminId?: string;
  adminEmail?: string;
  changedBy?: string;
}

// In-Memory Cache with short TTL (10 seconds)
interface CacheRecord {
  data: LiveServiceStatus;
  cachedAt: number;
}

const CACHE_TTL_MS = 10_000; // 10 seconds TTL
const serviceStatusCache = new Map<string, CacheRecord>();
let allStatusesCache: { data: Map<string, LiveServiceStatus>; cachedAt: number } | null = null;

// Local fallback store for offline/test environments without Supabase credentials
const localFallbackOverrides = new Map<string, LiveServiceStatus>();
const localFallbackAudit: any[] = [];

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return createSupabaseClient(url, key);
}

/**
 * Manually invalidate in-memory cache (e.g., immediately after an admin toggle)
 */
export function invalidateServiceLockCache(serviceId?: string) {
  if (serviceId) {
    serviceStatusCache.delete(serviceId);
  } else {
    serviceStatusCache.clear();
  }
  allStatusesCache = null;
}

/**
 * Normalizes static code-level registry status ('enabled' | 'coming_soon' | 'hidden')
 * into the lock model ('enabled' | 'locked' | 'hidden').
 */
function normalizeRegistryStatus(status: ServiceStatus): ServiceLockStatus {
  if (status === 'coming_soon') return 'locked';
  return status;
}

/**
 * Constructs a fully enriched LiveServiceStatus object.
 */
function buildLiveStatus(raw: {
  serviceId: string;
  status: ServiceLockStatus;
  reason: string;
  customerFacingMessage?: string;
  customerMessage?: string;
  lockedBy?: string;
  lockedAt?: string;
  isFallback: boolean;
  updatedAt?: string;
}): LiveServiceStatus {
  const reg = MASTER_SERVICES.find((s) => s.id === raw.serviceId);
  const msg = raw.customerFacingMessage || raw.customerMessage || reg?.comingSoonMessage;
  return {
    ...raw,
    customerFacingMessage: msg,
    customerMessage: msg,
    isLocked: raw.status === 'locked' || raw.status === 'hidden',
    title: reg?.title || raw.serviceId,
  };
}

/**
 * Fetches all DB overrides with resilient fallback:
 * 1. Queries native `service_status` table
 * 2. If table not found, falls back to `system_settings` table (key 'service_lock_overrides')
 * 3. If no DB available, falls back to local in-memory store
 */
async function fetchDbOverrides(): Promise<Map<string, LiveServiceStatus>> {
  const overrides = new Map<string, LiveServiceStatus>();

  // Include any local overrides from current test/dev process
  localFallbackOverrides.forEach((val, key) => {
    overrides.set(key, val);
  });

  const supabase = getSupabaseClient();
  if (!supabase) return overrides;

  try {
    const { data, error } = await supabase
      .from('service_status')
      .select('*');

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        overrides.set(row.service_id, buildLiveStatus({
          serviceId: row.service_id,
          status: row.status as ServiceLockStatus,
          reason: row.reason || '',
          customerFacingMessage: row.customer_facing_message || undefined,
          lockedBy: row.locked_by || undefined,
          lockedAt: row.locked_at || undefined,
          isFallback: false,
          updatedAt: row.updated_at || undefined,
        }));
      });
      return overrides;
    }

    // Fallback strategy: Query system_settings if service_status table is missing
    const { data: settingRow, error: settingError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'service_lock_overrides')
      .single();

    if (!settingError && settingRow?.value && typeof settingRow.value === 'object') {
      const stored = settingRow.value as Record<string, any>;
      Object.entries(stored).forEach(([svcId, val]) => {
        overrides.set(svcId, buildLiveStatus({
          serviceId: svcId,
          status: val.status as ServiceLockStatus,
          reason: val.reason || '',
          customerFacingMessage: val.customerFacingMessage || undefined,
          lockedBy: val.lockedBy || undefined,
          lockedAt: val.lockedAt || undefined,
          isFallback: false,
          updatedAt: val.updatedAt || undefined,
        }));
      });
    }
  } catch (err) {
    console.error('[ServiceLock] Error fetching database overrides, falling back to static registry:', err);
  }

  return overrides;
}

/**
 * Gets the live, database-backed status for a specific service.
 * Respects the 10-second memory cache.
 * Falls back seamlessly to the static code-level registry if no DB override exists.
 */
export async function getLiveServiceStatus(serviceId: string): Promise<LiveServiceStatus> {
  const now = Date.now();
  const cached = serviceStatusCache.get(serviceId);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  // Ensure default Bingwa Sokoni lock is respected even if DB query fails or has no record yet
  const isBingwa = serviceId === 'safaricom-data' || serviceId === 'airtel-data';

  const allOverrides = await fetchDbOverrides();
  const dbRecord = allOverrides.get(serviceId);

  let result: LiveServiceStatus;

  if (dbRecord) {
    result = dbRecord;
  } else if (isBingwa) {
    // Default Bingwa Sokoni to locked right now per requirement
    result = buildLiveStatus({
      serviceId,
      status: 'locked',
      reason: 'Awaiting production API credentials.',
      customerFacingMessage: 'Data bundle vending is temporarily undergoing provider activation. Please check back shortly.',
      isFallback: false,
      lockedBy: 'system',
      lockedAt: new Date().toISOString(),
    });
  } else {
    // Fall back to existing static code-level registry
    const staticStatus = getServiceStatus(serviceId);
    const regService = MASTER_SERVICES.find((s) => s.id === serviceId);

    result = buildLiveStatus({
      serviceId,
      status: normalizeRegistryStatus(staticStatus),
      reason: staticStatus === 'coming_soon' ? (regService?.comingSoonMessage || 'Product rollout pending') : 'Default code configuration',
      customerFacingMessage: regService?.comingSoonMessage,
      isFallback: true,
    });
  }

  serviceStatusCache.set(serviceId, {
    data: result,
    cachedAt: now,
  });

  return result;
}

export type CombinedServiceStatus = typeof MASTER_SERVICES[number] & LiveServiceStatus;
export type LiveStatusCollection = CombinedServiceStatus[] & Record<string, CombinedServiceStatus>;

/**
 * Returns all registered services along with their evaluated live statuses.
 * Returned collection can be used both as an array (map, filter) and as a dictionary (all[serviceId]).
 */
export async function getAllLiveServiceStatuses(): Promise<LiveStatusCollection> {
  const now = Date.now();

  const createCollection = (items: CombinedServiceStatus[]): LiveStatusCollection => {
    const arr = [...items] as LiveStatusCollection;
    for (const item of items) {
      (arr as any)[item.id] = item;
      (arr as any)[item.serviceId] = item;
    }
    return arr;
  };

  if (allStatusesCache && now - allStatusesCache.cachedAt < CACHE_TTL_MS) {
    const list = MASTER_SERVICES.map((service) => {
      const live = allStatusesCache!.data.get(service.id) || buildLiveStatus({
        serviceId: service.id,
        status: normalizeRegistryStatus(service.defaultStatus),
        reason: 'Default code configuration',
        isFallback: true,
      });
      return {
        ...service,
        ...live,
      };
    });
    return createCollection(list);
  }

  const overrides = await fetchDbOverrides();
  const resultMap = new Map<string, LiveServiceStatus>();

  const list = MASTER_SERVICES.map((service) => {
    let live: LiveServiceStatus;
    const dbRecord = overrides.get(service.id);
    const isBingwa = service.id === 'safaricom-data' || service.id === 'airtel-data';

    if (dbRecord) {
      live = dbRecord;
    } else if (isBingwa) {
      live = buildLiveStatus({
        serviceId: service.id,
        status: 'locked',
        reason: 'Awaiting production API credentials.',
        customerFacingMessage: 'Data bundle vending is temporarily undergoing provider activation. Please check back shortly.',
        isFallback: false,
        lockedBy: 'system',
        lockedAt: new Date().toISOString(),
      });
    } else {
      const staticStatus = getServiceStatus(service.id);
      live = buildLiveStatus({
        serviceId: service.id,
        status: normalizeRegistryStatus(staticStatus),
        reason: staticStatus === 'coming_soon' ? (service.comingSoonMessage || 'Product rollout pending') : 'Default code configuration',
        customerFacingMessage: service.comingSoonMessage,
        isFallback: true,
      });
    }

    resultMap.set(service.id, live);
    return {
      ...service,
      ...live,
    };
  });

  allStatusesCache = {
    data: resultMap,
    cachedAt: now,
  };

  return createCollection(list);
}

/**
 * Updates a service status in the database, records audit entry, invalidates cache,
 * and sends an admin notification email.
 */
export async function setServiceStatus(params: SetServiceStatusParams): Promise<LiveServiceStatus> {
  const serviceId = params.serviceId || params.serviceSlug;
  const { status, reason } = params;
  const customerFacingMessage = params.customerFacingMessage || params.customerMessage;
  const adminEmail = params.adminEmail || params.changedBy || 'admin@qasinet.com';
  const adminId = params.adminId;

  if (!serviceId) {
    throw new Error('A valid serviceId is required.');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    throw new Error('A mandatory reason is required to change service status.');
  }

  const regService = MASTER_SERVICES.find((s) => s.id === serviceId);
  const serviceTitle = regService?.title || serviceId;
  const nowIso = new Date().toISOString();
  const action = status === 'locked' ? 'LOCK' : (status === 'enabled' ? 'UNLOCK' : 'STATUS_CHANGE');

  const updatedLiveStatus = buildLiveStatus({
    serviceId,
    status,
    reason: reason.trim(),
    customerFacingMessage: customerFacingMessage?.trim() || undefined,
    lockedBy: adminEmail || adminId || 'admin',
    lockedAt: status === 'locked' ? nowIso : undefined,
    isFallback: false,
    updatedAt: nowIso,
  });

  const supabase = getSupabaseClient();
  let dbSuccess = false;

  if (supabase) {
    // 1. Attempt writing to native service_status & service_status_audit tables
    try {
      const { error: upsertErr } = await supabase
        .from('service_status')
        .upsert({
          service_id: serviceId,
          status,
          reason: reason.trim(),
          customer_facing_message: customerFacingMessage?.trim() || null,
          locked_by: adminEmail || adminId || 'admin',
          locked_at: status === 'locked' ? nowIso : null,
          updated_at: nowIso,
        });

      if (!upsertErr) {
        dbSuccess = true;
        // Record audit history entry
        await supabase.from('service_status_audit').insert({
          service_id: serviceId,
          action,
          status,
          reason: reason.trim(),
          customer_facing_message: customerFacingMessage?.trim() || null,
          admin_id: adminId || null,
          admin_email: adminEmail,
          created_at: nowIso,
        });
      }
    } catch (err) {
      console.warn('[ServiceLock] Native table write skipped or failed, using system_settings fallback:', err);
    }

    // 2. Fallback writing to system_settings if native table write failed
    if (!dbSuccess) {
      try {
        const { data: existingRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'service_lock_overrides')
          .single();

        const currentMap = (existingRow?.value as Record<string, any>) || {};
        currentMap[serviceId] = {
          status,
          reason: reason.trim(),
          customerFacingMessage: customerFacingMessage?.trim() || null,
          lockedBy: adminEmail || adminId || 'admin',
          lockedAt: status === 'locked' ? nowIso : null,
          updatedAt: nowIso,
        };

        await supabase
          .from('system_settings')
          .upsert({
            key: 'service_lock_overrides',
            value: currentMap,
            description: 'Live admin service status lock overrides',
            updated_at: nowIso,
          });

        // Also record to system_settings audit log
        const { data: auditRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'service_status_audit_log')
          .single();

        const auditList = Array.isArray(auditRow?.value) ? auditRow.value : [];
        auditList.unshift({
          id: `audit-${Date.now()}`,
          service_id: serviceId,
          action,
          status,
          reason: reason.trim(),
          customer_facing_message: customerFacingMessage?.trim() || null,
          admin_id: adminId || null,
          admin_email: adminEmail,
          created_at: nowIso,
        });

        if (auditList.length > 100) auditList.length = 100;

        await supabase
          .from('system_settings')
          .upsert({
            key: 'service_status_audit_log',
            value: auditList,
            description: 'Audit history of service lock/unlock actions',
            updated_at: nowIso,
          });
      } catch (fallbackErr) {
        console.warn('[ServiceLock] system_settings write failed, saving to local fallback:', fallbackErr);
      }
    }
  }

  // Always store in local fallback map so immediate queries succeed in any environment
  localFallbackOverrides.set(serviceId, updatedLiveStatus);
  localFallbackAudit.unshift({
    id: `audit-${Date.now()}`,
    service_id: serviceId,
    serviceId,
    action,
    status,
    new_status: status,
    reason: reason.trim(),
    customer_message: customerFacingMessage?.trim() || null,
    customer_facing_message: customerFacingMessage?.trim() || null,
    customerFacingMessage: customerFacingMessage?.trim() || null,
    admin_id: adminId || null,
    admin_email: adminEmail,
    changed_by: adminEmail,
    created_at: nowIso,
    createdAt: nowIso,
  });

  // 3. Immediately invalidate memory cache
  invalidateServiceLockCache(serviceId);

  // 4. Send asynchronous admin notification email
  try {
    await sendAdminServiceLockAlertEmail({
      serviceId,
      serviceName: serviceTitle,
      action: status === 'locked' ? 'LOCKED' : 'UNLOCKED',
      status,
      reason: reason.trim(),
      customerFacingMessage: customerFacingMessage?.trim() || undefined,
      adminEmail,
      date: nowIso,
    });
  } catch (emailErr) {
    console.error('[ServiceLock] Failed to send admin alert email:', emailErr);
  }

  return updatedLiveStatus;
}

/**
 * Retrieves the audit history of all past service status actions.
 */
export async function getServiceAuditHistory(serviceId?: string, limit: number = 50): Promise<ServiceAuditEntry[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    // Try native audit table
    try {
      let query = supabase
        .from('service_status_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => {
          const regService = MASTER_SERVICES.find((s) => s.id === row.service_id);
          return {
            id: row.id,
            serviceId: row.service_id,
            service_id: row.service_id,
            serviceTitle: regService?.title || row.service_id,
            action: row.action as ServiceAuditEntry['action'],
            status: row.status as ServiceLockStatus,
            new_status: row.status,
            reason: row.reason,
            customerFacingMessage: row.customer_facing_message || undefined,
            customer_message: row.customer_facing_message || undefined,
            adminId: row.admin_id || undefined,
            adminEmail: row.admin_email || undefined,
            changedBy: row.admin_email || undefined,
            changed_by: row.admin_email || undefined,
            createdAt: row.created_at,
            created_at: row.created_at,
          };
        });
      }
    } catch (err) {
      console.warn('[ServiceLock] Native audit log read skipped or failed, checking system_settings:', err);
    }

    // Fallback to system_settings
    try {
      const { data: auditRow } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'service_status_audit_log')
        .single();

      if (auditRow?.value && Array.isArray(auditRow.value)) {
        let list = auditRow.value;
        if (serviceId) {
          list = list.filter((e: any) => e.service_id === serviceId);
        }
        return list.slice(0, limit).map((item: any) => {
          const regService = MASTER_SERVICES.find((s) => s.id === item.service_id);
          return {
            id: item.id || `audit-${Date.now()}`,
            serviceId: item.service_id,
            service_id: item.service_id,
            serviceTitle: regService?.title || item.service_id,
            action: item.action,
            status: item.status,
            new_status: item.status,
            reason: item.reason,
            customerFacingMessage: item.customer_facing_message || undefined,
            customer_message: item.customer_facing_message || undefined,
            adminId: item.admin_id || undefined,
            adminEmail: item.admin_email || undefined,
            changedBy: item.admin_email || undefined,
            changed_by: item.admin_email || undefined,
            createdAt: item.created_at,
            created_at: item.created_at,
          };
        });
      }
    } catch (err) {
      console.error('[ServiceLock] Error reading audit history fallback:', err);
    }
  }

  // Fallback to local memory audit
  let localList = [...localFallbackAudit];
  if (serviceId) {
    localList = localList.filter((e) => e.service_id === serviceId || e.serviceId === serviceId);
  }
  return localList.slice(0, limit);
}
