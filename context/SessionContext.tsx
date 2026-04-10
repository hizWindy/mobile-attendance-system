import React, { createContext, useState, useCallback, ReactNode } from "react";
import SessionService from "../api/SessionService"; // Using TS module
import { BackendSession } from "../types/SessionTypes";

// ---------------------
// 1️⃣ Context
// ---------------------
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

export interface SessionContextType {
  sessions: BackendSession[];
  loading: LoadingState;
  error: ErrorState;
  getSessions: () => Promise<void>;
  addSession: (sessionData: Partial<BackendSession>) => Promise<BackendSession | null>;
  removeSession: (id: number | string) => Promise<void>;
}

export const SessionContext = createContext<SessionContextType | null>(null);

// ---------------------
// 2️⃣ Provider
// ---------------------
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  // State
  const [sessions, setSessions] = useState<BackendSession[]>([]);

  // Per-action loading
  const [loading, setLoading] = useState<LoadingState>({
    list: false,
    add: false,
    remove: false,
  });

  // Per-action error
  const [error, setError] = useState<ErrorState>({
    list: null,
    add: null,
    remove: null,
  });

  // ---------------------
  // Fetch all sessions
  // ---------------------
  const getSessions = useCallback(async () => {
    setLoading(prev => ({ ...prev, list: true }));
    setError(prev => ({ ...prev, list: null }));
    try {
      const response = await SessionService.getMyList();
      let fetchedSessions: BackendSession[] = [];
      
      if (Array.isArray(response)) {
        fetchedSessions = response;
      } else if (response?.sessions) {
        fetchedSessions = response.sessions;
      } else if ((response as any)?.data?.sessions) {
        fetchedSessions = (response as any).data.sessions;
      }

      
      setSessions(fetchedSessions);
    } catch (err) {
      console.error(err);
      setError(prev => ({ ...prev, list: "Failed to load sessions" }));
    } finally {
      setLoading(prev => ({ ...prev, list: false }));
    }
  }, []);


  // ---------------------
  // Add a session
  // ---------------------
  const addSession = useCallback(async (sessionData: Partial<BackendSession>) => {
    setLoading(prev => ({ ...prev, add: true }));
    setError(prev => ({ ...prev, add: null }));
    try {
      const newSession = await SessionService.createSession(sessionData);
      setSessions(prev => [...prev, newSession]);
      return newSession;
    } catch (err) {
      console.error(err);
      setError(prev => ({ ...prev, add: "Failed to create session" }));
      return null;
    } finally {
      setLoading(prev => ({ ...prev, add: false }));
    }
  }, []);

  // ---------------------
  // Remove a session
  // ---------------------
  const removeSession = useCallback(async (id: number | string) => {
    setLoading(prev => ({ ...prev, remove: true }));
    setError(prev => ({ ...prev, remove: null }));
    try {
      await SessionService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.session_id !== id));
    } catch (err) {
      console.error(err);
      setError(prev => ({ ...prev, remove: "Failed to delete session" }));
    } finally {
      setLoading(prev => ({ ...prev, remove: false }));
    }
  }, []);

  // ---------------------
  // Context value
  // ---------------------
  const value: SessionContextType = {
    sessions,
    loading,
    error,
    getSessions,
    addSession,
    removeSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
