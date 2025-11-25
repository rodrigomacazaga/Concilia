"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseMemoryBankSyncOptions {
  projectId: string;
  service?: string | null;
  autoSyncInterval?: number; // en milisegundos, default 5 minutos
  enabled?: boolean;
}

interface SyncResult {
  success: boolean;
  service: string;
  filesUpdated: string[];
  generalFilesUpdated: string[];
  errors: string[];
  timestamp: string;
}

export function useMemoryBankSync({
  projectId,
  service,
  autoSyncInterval = 5 * 60 * 1000, // 5 minutos
  enabled = true,
}: UseMemoryBankSyncOptions) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sync = useCallback(async (): Promise<SyncResult | null> => {
    if (!enabled || !service || !projectId) return null;

    setIsSyncing(true);

    try {
      const response = await fetch("/api/memory-bank/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, service }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        setLastSync(new Date());
        setPendingChanges([]);
        setLastSyncResult(data.result);
        return data.result;
      }

      return null;
    } catch (error) {
      console.error("Memory Bank sync failed:", error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, service, enabled]);

  const markFileChanged = useCallback((fileName: string) => {
    setPendingChanges((prev) => {
      if (prev.includes(fileName)) return prev;
      return [...prev, fileName];
    });
  }, []);

  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  // Auto-sync interval
  useEffect(() => {
    if (!enabled || !service) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (pendingChanges.length > 0) {
        sync();
      }
    }, autoSyncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, service, autoSyncInterval, sync, pendingChanges.length]);

  // Sync on unmount if there are pending changes
  useEffect(() => {
    return () => {
      // Note: This won't actually work in all cases due to React's cleanup timing
      // but it's a best-effort attempt
      if (pendingChanges.length > 0 && service && projectId) {
        // Fire and forget sync on unmount
        fetch("/api/memory-bank/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, service }),
        }).catch(console.error);
      }
    };
  }, []); // Empty deps intentional - we want this to run only on unmount

  return {
    sync,
    markFileChanged,
    clearPendingChanges,
    lastSync,
    pendingChanges,
    isSyncing,
    lastSyncResult,
    hasPendingChanges: pendingChanges.length > 0,
  };
}

export default useMemoryBankSync;
