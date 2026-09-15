import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  enqueueOfflineOrder,
  getOfflineOrders,
  removeOfflineOrder,
  clearOfflineQueue,
  syncOfflineQueue
} from '../src/lib/offline/queue';
import { OrderPayload, PaymentService } from '../src/lib/payment';

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

describe('Offline Order Queue & Idempotency Manager', () => {
  const sampleOrder: OrderPayload = {
    serviceId: 'safaricom-data',
    serviceName: 'Safaricom 1.25 GB',
    provider: 'Safaricom',
    destination: '0712345678',
    amount: 51,
    fees: 0,
    paymentPhone: '0712345678',
    productId: '1.25GB'
  };

  beforeEach(() => {
    const localMock = createStorageMock();
    const sessionMock = createStorageMock();

    (globalThis as unknown as { window: unknown }).window = globalThis;

    Object.defineProperty(globalThis, 'localStorage', {
      value: localMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionMock,
      configurable: true,
      writable: true,
    });

    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('enqueues an order with a distinct ID and IDK-prefixed idempotency key', () => {
    const queued = enqueueOfflineOrder(sampleOrder);

    expect(queued.id).toMatch(/^OFL-\d+-[a-z0-9]+$/);
    expect(queued.idempotencyKey).toBe(`IDK-${queued.id}`);
    expect(queued.status).toBe('QUEUED');
    expect(queued.order.destination).toBe('0712345678');
    expect(queued.order.amount).toBe(51);

    const orders = getOfflineOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe(queued.id);
  });

  it('deduplicates identical orders enqueued within 3 minutes', () => {
    const first = enqueueOfflineOrder(sampleOrder);
    const second = enqueueOfflineOrder(sampleOrder);

    expect(second.id).toBe(first.id);
    expect(getOfflineOrders()).toHaveLength(1);
  });

  it('removes orders by ID upon successful processing', () => {
    const order1 = enqueueOfflineOrder(sampleOrder);
    const order2 = enqueueOfflineOrder({
      ...sampleOrder,
      destination: '0722000000',
      amount: 41,
      productId: '2GB'
    });

    expect(getOfflineOrders()).toHaveLength(2);

    removeOfflineOrder(order1.id);
    const remaining = getOfflineOrders();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(order2.id);
  });

  it('clears all queued orders', () => {
    enqueueOfflineOrder(sampleOrder);
    enqueueOfflineOrder({
      ...sampleOrder,
      destination: '0799112233'
    });
    expect(getOfflineOrders()).toHaveLength(2);

    clearOfflineQueue();
    expect(getOfflineOrders()).toHaveLength(0);
  });

  it('replays queued orders via PaymentService with idempotency key', async () => {
    const queued = enqueueOfflineOrder(sampleOrder);

    const initiateSpy = vi.spyOn(PaymentService, 'initiatePayment').mockResolvedValue({
      reference: 'QSN-TEST-REF',
      idempotencyKey: queued.idempotencyKey
    });

    // Mock online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const result = await syncOfflineQueue();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(initiateSpy).toHaveBeenCalledWith(queued.order, queued.idempotencyKey);
    expect(getOfflineOrders()).toHaveLength(0); // Cleaned up
  });

  it('handles duplicate server error gracefully by cleaning up order', async () => {
    enqueueOfflineOrder(sampleOrder);

    vi.spyOn(PaymentService, 'initiatePayment').mockRejectedValue(
      new Error('DUPLICATE_REQUEST: A similar transaction is already in progress')
    );

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const result = await syncOfflineQueue();

    expect(result.synced).toBe(1);
    expect(getOfflineOrders()).toHaveLength(0);
  });

  it('respects sync mutex lock and skips if another tab is currently syncing', async () => {
    enqueueOfflineOrder(sampleOrder);

    // Simulate active lock from another tab
    sessionStorage.setItem('qasinet_offline_sync_lock', Date.now().toString());

    const initiateSpy = vi.spyOn(PaymentService, 'initiatePayment');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const result = await syncOfflineQueue();

    expect(result.synced).toBe(0);
    expect(initiateSpy).not.toHaveBeenCalled();
    expect(getOfflineOrders()).toHaveLength(1);
  });
});
