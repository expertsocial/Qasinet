import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/transactions/route';
import { setServiceStatus, invalidateServiceLockCache } from '../src/lib/services/service-lock';

describe('Checkout Choke Point Live Service Lock Enforcement', () => {
  beforeEach(() => {
    invalidateServiceLockCache();
  });

  it('rejects checkout with 503 SERVICE_LOCKED for default locked Bingwa Sokoni service', async () => {
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceSlug: 'safaricom-data',
        destination: '0712345678',
        amount: 100,
        guestPhone: '0712345678',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('SERVICE_LOCKED');
    expect(data.error.message).toContain('Data bundle vending');
  });

  it('allows checkout flow past the service lock choke point when service is active', async () => {
    // safaricom-airtime is enabled in master registry
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceSlug: 'safaricom-airtime',
        destination: '0712345678',
        amount: 50,
        guestPhone: '0712345678',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    
    // It should NOT be rejected by SERVICE_LOCKED
    if (res.status === 503) {
      expect(data.error?.code).not.toBe('SERVICE_LOCKED');
    }
  });

  it('immediately blocks a previously active service when admin locks it', async () => {
    // 1. Lock faiba-data dynamically
    await setServiceStatus({
      serviceSlug: 'faiba-data',
      status: 'locked',
      reason: 'Upstream gateway API timeout spike',
      customerMessage: 'Faiba bundles are temporarily paused while upstream maintenance is completed.',
      changedBy: 'admin@qasinet.com',
    });

    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceSlug: 'faiba-data',
        destination: '0747123456',
        amount: 300,
        guestPhone: '0747123456',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('SERVICE_LOCKED');
    expect(data.error.message).toBe('Faiba bundles are temporarily paused while upstream maintenance is completed.');

    // 2. Unlock it and verify it unblocks
    await setServiceStatus({
      serviceSlug: 'faiba-data',
      status: 'enabled',
      reason: 'Upstream connection stabilized',
      changedBy: 'admin@qasinet.com',
    });

    const unblockedReq = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceSlug: 'faiba-data',
        destination: '0747123456',
        amount: 300,
        guestPhone: '0747123456',
      }),
    });

    const unblockedRes = await POST(unblockedReq);
    const unblockedData = await unblockedRes.json();
    if (unblockedRes.status === 503) {
      expect(unblockedData.error?.code).not.toBe('SERVICE_LOCKED');
    }
  });
});
