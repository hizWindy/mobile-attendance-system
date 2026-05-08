// /context/MySessionsContext.tsx
//
// Manages sessions CREATED by the currently authenticated user.
// Supervisor / admin perspective.
// Replaces the old SessionContext.tsx — all consumers updated to import from here.

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import SessionService from "../api/SessionService";
import { BackendSession } from "../types/SessionTypes";
import { AuthContext } from "./AuthContext";

// ─── Polling interval ─────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// ─── State shapes ─────────────────────────────────────────────────────────────
interface LoadingState {
  list: boolean;
  add: boolean;
  remove: boolean;
}

interface ErrorState {
  list: string | null;
  add: string | null;
  remove: string | null;
}

export interface MySessionsContextType {
  sessions: BackendSession[];
  loading: LoadingState;
  error: ErrorState;
  /** Manually trigger a session list refresh (e.g. pull-to-refresh). */
  getSessions: () => Promise<void>;
  addSession: (
    sessionData: Partial<BackendSession>,
  ) => Promise<BackendSession | null>;
  removeSession: (id: number | string) => Promise<void>;
  updateSessionInState: (updatedSession: BackendSession) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const MySessionsContext =
  createContext<MySessionsContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const MySessionsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { token } = useContext(AuthContext);
  const [sessions, setSessions] = useState<BackendSession[]>([]);

  const [loading, setLoading] = useState<LoadingState>({
    list: false,
    add: false,
    remove: false,
  });

  const [error, setError] = useState<ErrorState>({
    list: null,
    add: null,
    remove: null,
  });

  // ── Fetch my sessions ──────────────────────────────────────────────────────
  const getSessions = useCallback(async () => {
    setLoading((prev) => ({ ...prev, list: true }));
    setError((prev) => ({ ...prev, list: null }));
    try {
      const response = await SessionService.getMyList();
      
      let fetched: BackendSession[] = [];
      const resAny = response as any;

      if (Array.isArray(resAny)) {
        fetched = resAny;
      } else if (resAny?.data) {
        if (Array.isArray(resAny.data)) {
          fetched = resAny.data;
        } else if (Array.isArray(resAny.data?.sessions)) {
          fetched = resAny.data.sessions;
        } else if (Array.isArray(resAny.data?.data)) {
          fetched = resAny.data.data;
        } else if (typeof resAny.data === 'object') {
          // Flatten objects if somehow it's dict-mapped
          const vals = Object.values(resAny.data);
          if (vals.length > 0 && typeof vals[0] === 'object') {
            fetched = vals as BackendSession[];
          }
        }
      } else if (Array.isArray(resAny?.sessions)) {
        fetched = resAny.sessions;
      }

      console.log(`[MySessionsContext] Parsed ${fetched?.length || 0} sessions.`);
      setSessions((prev) => {
        const newData = fetched || [];
        if (JSON.stringify(prev) !== JSON.stringify(newData)) {
          return newData;
        }
        return prev;
      });
    } catch (err) {
      console.error("[MySessionsContext] getSessions error:", err);
      setError((prev) => ({ ...prev, list: "Failed to load sessions" }));
    } finally {
      setLoading((prev) => ({ ...prev, list: false }));
    }
  }, []);

  // ── Add a session ──────────────────────────────────────────────────────────
  const addSession = useCallback(
    async (sessionData: Partial<BackendSession>) => {
      setLoading((prev) => ({ ...prev, add: true }));
      setError((prev) => ({ ...prev, add: null }));
      try {
        const newSession = await SessionService.createSession(sessionData);
        setSessions((prev) => [...prev, newSession]);
        return newSession;
      } catch (err) {
        console.error("[MySessionsContext] addSession error:", err);
        setError((prev) => ({ ...prev, add: "Failed to create session" }));
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, add: false }));
      }
    },
    [],
  );

  // ── Remove a session ───────────────────────────────────────────────────────
  const removeSession = useCallback(async (id: number | string) => {
    setLoading((prev) => ({ ...prev, remove: true }));
    setError((prev) => ({ ...prev, remove: null }));
    try {
      await SessionService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
    } catch (err) {
      console.error("[MySessionsContext] removeSession error:", err);
      setError((prev) => ({ ...prev, remove: "Failed to delete session" }));
      throw err;
    } finally {
      setLoading((prev) => ({ ...prev, remove: false }));
    }
  }, []);

  // ── Update a session directly in state ─────────────────────────────────────
  const updateSessionInState = useCallback((updatedSession: BackendSession) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.session_id === updatedSession.session_id ? updatedSession : s
      )
    );
  }, []);

  // ── Auth-aware fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return; // skip if no token
    getSessions(); // load immediately when token arrives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value: MySessionsContextType = {
    sessions,
    loading,
    error,
    getSessions,
    addSession,
    removeSession,
    updateSessionInState,
  };

  return (
    <MySessionsContext.Provider value={value}>
      {children}
    </MySessionsContext.Provider>
  );
};
