"use client";

import { useState, useEffect, useCallback } from 'react';
import { getOfflineOrders, syncOfflineQueue } from './queue';
import { toast } from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      return getOfflineOrders().filter((o) => o.status === 'QUEUED' || o.status === 'FAILED').length;
    } catch {
      return 0;
    }
  });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // Update pending queue count
  const refreshPendingCount = useCallback(() => {
    const orders = getOfflineOrders().filter((o) => o.status === 'QUEUED' || o.status === 'FAILED');
    setPendingOrdersCount(orders.length);
  }, []);

  const handleSync = useCallback(async () => {
    const res = await syncOfflineQueue();
    refreshPendingCount();
    if (res.synced > 0) {
      toast.success(`Internet restored! Dispatched ${res.synced} queued order(s).`);
    }
    return res;
  }, [refreshPendingCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      setIsOnline(true);
      toast.success('You are back online!', { id: 'online-toast', duration: 3000 });
      handleSync();
    };

    const onOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
      toast('You are now in Offline Mode. Zero data? You can still browse & buy via M-Pesa.', {
        id: 'offline-toast',
        icon: '⚡',
        duration: 5000,
      });
    };

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const onSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'QASINET_TRIGGER_SYNC') {
        handleSync();
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    navigator.serviceWorker?.addEventListener('message', onSWMessage);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      navigator.serviceWorker?.removeEventListener('message', onSWMessage);
    };
  }, [handleSync, refreshPendingCount]);

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
        toast.success('QasiNet installed to your home screen!');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Installation prompt failed:', err);
      return false;
    }
  }, [installPrompt]);

  return {
    isOnline,
    isOffline: !isOnline,
    pendingOrdersCount,
    isInstallable,
    installPWA,
    syncNow: handleSync,
    refreshPendingCount
  };
}
