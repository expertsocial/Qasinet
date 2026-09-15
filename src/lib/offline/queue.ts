import { OrderPayload, PaymentService } from '@/lib/payment';

export interface QueuedOrder {
  id: string;
  idempotencyKey: string;
  order: OrderPayload;
  createdAt: number;
  retryCount: number;
  status: 'QUEUED' | 'SYNCING' | 'FAILED' | 'COMPLETED';
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'qasinet_offline_order_queue';
const SYNC_LOCK_KEY = 'qasinet_offline_sync_lock';
const SYNC_LOCK_TTL_MS = 30000; // 30 seconds

/**
 * Retrieves all stored offline orders from localStorage.
 */
export function getOfflineOrders(): QueuedOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOrder[];
  } catch (err) {
    console.error('[OfflineQueue] Failed to parse queued orders:', err);
    return [];
  }
}

/**
 * Saves a new offline order with an unambiguous UUID-based idempotency key.
 */
export function enqueueOfflineOrder(order: OrderPayload): QueuedOrder {
  if (typeof window === 'undefined') {
    throw new Error('Offline queue is only available in browser environments');
  }

  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const id = `OFL-${Date.now()}-${randomSuffix}`;
  const idempotencyKey = `IDK-${id}`;

  const newOrder: QueuedOrder = {
    id,
    idempotencyKey,
    order,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'QUEUED'
  };

  const current = getOfflineOrders();
  // Deduplicate against identical payload queued within last 3 minutes
  const isDuplicate = current.some(
    (item) =>
      item.order.destination === order.destination &&
      item.order.amount === order.amount &&
      item.order.serviceId === order.serviceId &&
      item.createdAt > Date.now() - 3 * 60 * 1000
  );

  if (isDuplicate) {
    console.warn('[OfflineQueue] Duplicate order detected within 3-minute window, ignoring.');
    return current.find(
      (item) =>
        item.order.destination === order.destination &&
        item.order.amount === order.amount &&
        item.order.serviceId === order.serviceId
    ) || newOrder;
  }

  const updated = [newOrder, ...current];
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
  return newOrder;
}

/**
 * Removes an order by ID upon successful sync.
 */
export function removeOfflineOrder(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getOfflineOrders();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[OfflineQueue] Failed to remove order:', err);
  }
}

/**
 * Updates order status or retry count in the queue.
 */
export function updateQueuedOrder(id: string, updates: Partial<QueuedOrder>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getOfflineOrders();
    const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[OfflineQueue] Failed to update order:', err);
  }
}

/**
 * Clears all queued offline orders.
 */
export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(QUEUE_STORAGE_KEY);
}

/**
 * Mutex lock helper to prevent concurrent replay across browser tabs or rapid online events.
 */
function acquireSyncLock(): boolean {
  try {
    const now = Date.now();
    const existing = sessionStorage.getItem(SYNC_LOCK_KEY);
    if (existing) {
      const lockTime = parseInt(existing, 10);
      if (now - lockTime < SYNC_LOCK_TTL_MS) {
        return false; // Lock active
      }
    }
    sessionStorage.setItem(SYNC_LOCK_KEY, now.toString());
    return true;
  } catch {
    return true;
  }
}

function releaseSyncLock(): void {
  try {
    sessionStorage.removeItem(SYNC_LOCK_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Processes queued orders sequentially using idempotent API dispatch.
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined') return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  if (!acquireSyncLock()) {
    console.log('[OfflineQueue] Sync already in progress in another tab.');
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  try {
    const orders = getOfflineOrders().filter((o) => o.status === 'QUEUED' || o.status === 'FAILED');

    for (const item of orders) {
      // Mark syncing
      updateQueuedOrder(item.id, { status: 'SYNCING' });

      try {
        console.log(`[OfflineQueue] Replaying order ${item.id} with key ${item.idempotencyKey}`);
        await PaymentService.initiatePayment(item.order, item.idempotencyKey);
        removeOfflineOrder(item.id);
        synced += 1;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Sync dispatch failed';
        console.error(`[OfflineQueue] Failed to sync order ${item.id}:`, errorMsg);

        // If duplicate or already processed, clean it up
        if (errorMsg.includes('DUPLICATE_REQUEST') || errorMsg.includes('already in progress')) {
          removeOfflineOrder(item.id);
          synced += 1;
        } else {
          updateQueuedOrder(item.id, {
            status: 'FAILED',
            retryCount: item.retryCount + 1,
            lastError: errorMsg
          });
          failed += 1;
        }
      }
    }
  } finally {
    releaseSyncLock();
  }

  return { synced, failed };
}
