// /context/DiscoverSessionsContext.tsx
//
// Handles the "Participate / Join" flow for attendees.
// Allows searching for a session by 6-digit code and joining it.

import React, {
  createContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import SessionService from "../api/SessionService";
import { BackendSession } from "../types/SessionTypes";

// ─── Context shape ────────────────────────────────────────────────────────────
export interface DiscoverSessionsContextType {
  /** The session found by the last successful search. */
  discoveredSession: BackendSession | null;
  searchLoading: boolean;
  searchError: string | null;
  /**
   * Search for a session by its 6-digit code.
   * Populates `discoveredSession` on success or sets `searchError` on failure.
   */
  searchByCode: (code: string) => Promise<BackendSession | null>;
  /** Clear the currently discovered session and any error. */
  clearDiscovery: () => void;
}

export const DiscoverSessionsContext =
  createContext<DiscoverSessionsContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const DiscoverSessionsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [discoveredSession, setDiscoveredSession] =
    useState<BackendSession | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchByCode = useCallback(
    async (code: string): Promise<BackendSession | null> => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setSearchError("Please enter a session code.");
        return null;
      }

      setSearchLoading(true);
      setSearchError(null);
      setDiscoveredSession(null);

      try {
        // SessionService.get() fetches by code or id — backend handles it
        const session = await SessionService.get(trimmed);
        setDiscoveredSession(session);
        return session;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          setSearchError("Session not found. Check your code and try again.");
        } else {
          setSearchError("Something went wrong. Please try again.");
        }
        return null;
      } finally {
        setSearchLoading(false);
      }
    },
    [],
  );

  const clearDiscovery = useCallback(() => {
    setDiscoveredSession(null);
    setSearchError(null);
  }, []);

  const value: DiscoverSessionsContextType = {
    discoveredSession,
    searchLoading,
    searchError,
    searchByCode,
    clearDiscovery,
  };

  return (
    <DiscoverSessionsContext.Provider value={value}>
      {children}
    </DiscoverSessionsContext.Provider>
  );
};
