import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getLiveServiceStatus, 
  getAllLiveServiceStatuses, 
  setServiceStatus, 
  invalidateServiceLockCache,
  getServiceAuditHistory 
} from '../src/lib/services/service-lock';
import { getTransactionFeedback } from '../src/lib/feedback/transaction-feedback';

// Mock Supabase to test both normal and database-fallback operations
vi.mock('@supabase/supabase-js', () => {
  let inMemoryOverrides: Record<string, any> = {};
  let inMemoryAudit: any[] = [];

  const mockClient = {
    from: (table: string) => {
      if (table === 'service_status') {
        return {
          select: (cols: string) => ({
            eq: (col: string, val: any) => ({
              single: async () => {
                const rec = inMemoryOverrides[val];
                if (!rec) return { data: null, error: { message: 'Not found' } };
                return { data: rec, error: null };
              },
            }),
            then: (resolve: any) => {
              const rows = Object.values(inMemoryOverrides);
              resolve({ data: rows, error: null });
            },
          }),
          upsert: async (record: any) => {
            inMemoryOverrides[record.service_id] = {
              ...record,
              updated_at: new Date().toISOString(),
            };
            return { error: null };
          },
        };
      }

      if (table === 'service_status_audit') {
        return {
          insert: async (record: any) => {
            inMemoryAudit.unshift({
              ...record,
              id: `audit-${Date.now()}-${Math.random()}`,
              created_at: new Date().toISOString(),
            });
            return { error: null };
          },
          select: (cols: string) => ({
            order: (col: string, opts: any) => ({
              limit: (limit: number) => ({
                eq: (eqCol: string, eqVal: any) => Promise.resolve({
                  data: inMemoryAudit.filter(a => a.service_id === eqVal).slice(0, limit),
                  error: null
                }),
                then: (resolve: any) => {
                  resolve({ data: inMemoryAudit.slice(0, limit), error: null });
                },
              }),
            }),
          }),
        };
      }

      // Default system_settings fallback
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: 'Table not found' } }),
          }),
        }),
        upsert: async () => ({ error: null }),
      };
    },
  };

  return {
    createClient: () => mockClient,
  };
});

describe('Live Service Lock & Killswitch Engine', () => {
  beforeEach(() => {
    invalidateServiceLockCache();
  });

  it('falls back to static registry defaults for unconfigured services', async () => {
    const safaricomStatus = await getLiveServiceStatus('safaricom-airtime');
    expect(safaricomStatus.status).toBe('enabled');
    expect(safaricomStatus.isLocked).toBe(false);

    const kplcStatus = await getLiveServiceStatus('kplc-prepaid');
    expect(kplcStatus.status).toBe('hidden');
    expect(kplcStatus.isLocked).toBe(true);
  });

  it('safeguards Bingwa Sokoni services (safaricom-data, airtel-data) as locked by default', async () => {
    const safaricomData = await getLiveServiceStatus('safaricom-data');
    expect(safaricomData.status).toBe('locked');
    expect(safaricomData.isLocked).toBe(true);
    expect(safaricomData.reason).toContain('Awaiting production API credentials');

    const airtelData = await getLiveServiceStatus('airtel-data');
    expect(airtelData.status).toBe('locked');
    expect(airtelData.isLocked).toBe(true);
    expect(airtelData.reason).toContain('Awaiting production API credentials');
  });

  it('enforces mandatory reason when updating service status', async () => {
    // Empty reason should throw
    await expect(
      setServiceStatus({
        serviceSlug: 'safaricom-airtime',
        status: 'locked',
        reason: '   ',
        changedBy: 'admin@qasinet.com',
      })
    ).rejects.toThrow(/mandatory reason/i);

    // Too short reason should throw
    await expect(
      setServiceStatus({
        serviceSlug: 'safaricom-airtime',
        status: 'locked',
        reason: 'no',
        changedBy: 'admin@qasinet.com',
      })
    ).rejects.toThrow(/mandatory reason/i);
  });

  it('updates service status, invalidates cache immediately, and logs audit record', async () => {
    // 1. Initially enabled
    const initial = await getLiveServiceStatus('safaricom-airtime');
    expect(initial.status).toBe('enabled');

    // 2. Lock it with mandatory reason
    const lockResult = await setServiceStatus({
      serviceSlug: 'safaricom-airtime',
      status: 'locked',
      reason: 'Upstream gateway downtime investigation',
      customerMessage: 'Safaricom Airtime is momentarily unavailable for maintenance.',
      changedBy: 'ops@qasinet.com',
    });

    expect(lockResult.status).toBe('locked');
    expect(lockResult.reason).toBe('Upstream gateway downtime investigation');
    expect(lockResult.customerMessage).toBe('Safaricom Airtime is momentarily unavailable for maintenance.');

    // 3. getLiveServiceStatus should immediately reflect locked without redeploy
    const refreshed = await getLiveServiceStatus('safaricom-airtime');
    expect(refreshed.status).toBe('locked');
    expect(refreshed.isLocked).toBe(true);
    expect(refreshed.customerMessage).toBe('Safaricom Airtime is momentarily unavailable for maintenance.');

    // 4. Verify audit trail recorded this change
    const history = await getServiceAuditHistory('safaricom-airtime', 5);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].new_status).toBe('locked');
    expect(history[0].reason).toBe('Upstream gateway downtime investigation');
    expect(history[0].changed_by).toBe('ops@qasinet.com');

    // 5. Unlock / restore it
    await setServiceStatus({
      serviceSlug: 'safaricom-airtime',
      status: 'enabled',
      reason: 'Upstream connection verified operational',
      changedBy: 'ops@qasinet.com',
    });

    const restored = await getLiveServiceStatus('safaricom-airtime');
    expect(restored.status).toBe('enabled');
    expect(restored.isLocked).toBe(false);
  });

  it('getAllLiveServiceStatuses returns all services with live statuses', async () => {
    const all = await getAllLiveServiceStatuses();
    expect(all['safaricom-airtime']).toBeDefined();
    expect(all['safaricom-data']).toBeDefined();
    expect(all['airtel-data']).toBeDefined();
    expect(all['faiba-data']).toBeDefined();
  });
});

describe('Transaction Feedback for Service Lock', () => {
  it('categorizes locked services into warm human-toned maintenance feedback', () => {
    const feedback = getTransactionFeedback({
      status: 'SERVICE_LOCKED',
      message: 'Faiba data bundles are temporarily paused pending upstream provider activation.',
    });

    expect(feedback.category).toBe('SERVICE_LOCKED');
    expect(feedback.severity).toBe('warning');
    expect(feedback.headline).toBe('Service Temporarily Paused');
    expect(feedback.context).toContain('Faiba data bundles are temporarily paused');
    expect(feedback.badgeLabel).toBe('Under Maintenance');
    expect(feedback.showRetry).toBe(false);
    expect(feedback.showSupport).toBe(true);
  });

  it('handles generic service locked status gracefully with fallback context', () => {
    const feedback = getTransactionFeedback({
      status: 'SERVICE_LOCKED',
    });

    expect(feedback.category).toBe('SERVICE_LOCKED');
    expect(feedback.context).toContain('scheduled maintenance or is temporarily paused');
    expect(feedback.badgeLabel).toBe('Under Maintenance');
  });
});
