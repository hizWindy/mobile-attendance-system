import React, { createContext, useState, useEffect, useCallback, ReactNode } from "react";
import SessionService from "../api/SessionService";
import { BackendSession } from "../types/SessionTypes";

// ─── Global Source of Truth for Session Catalog ───
export interface SessionContextType {
  /** The full catalog of active backend sessions */
  sessions: BackendSession[];
  loading: boolean;
  error: string | null;
  /** Manually refetch the global catalog */
  getSessions: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextType>({
  sessions: [],
  loading: false,
  error: null,
  getSessions: async () => {},
});

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<BackendSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await SessionService.getList();
      
      let finalData: BackendSession[] = [];
      const resAny = res as any;

      if (Array.isArray(resAny)) {
        finalData = resAny;
      } else if (resAny?.data) {
        if (Array.isArray(resAny.data)) {
          finalData = resAny.data;
        } else if (Array.isArray(resAny.data?.sessions)) {
          finalData = resAny.data.sessions;
        } else if (Array.isArray(resAny.data?.data)) {
          finalData = resAny.data.data;
        } else if (typeof resAny.data === 'object') {
          const vals = Object.values(resAny.data);
          if (vals.length > 0 && typeof vals[0] === 'object') {
            finalData = vals as BackendSession[];
          }
        }
      } else if (Array.isArray(resAny?.sessions)) {
        finalData = resAny.sessions;
      }
        
      setSessions(finalData || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch global sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Boot fetch + 30-second background catalog sync
  useEffect(() => {
    getSessions();
    
    const intervalId = setInterval(() => {
      // Periodic background reload using the same function instance
      getSessions();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [getSessions]);

  return (
    <SessionContext.Provider value={{ sessions, loading, error, getSessions }}>
      {children}
    </SessionContext.Provider>
  );
};
