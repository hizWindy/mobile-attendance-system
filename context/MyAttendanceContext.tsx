// /context/MyAttendanceContext.tsx
//
// Fetches the current user's attendance records and categorizes them
// into upcoming / ongoing / completed / missed for the Participate tab.

import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import AttendanceService from "../api/AttendanceService";
import {
    AttendanceRecord,
    CategorizedAttendances,
} from "../types/AttendanceTypes";
import { deriveAttendanceCategory } from "../utils/timeUtils";
import { AuthContext } from "./AuthContext";

// ─── Polling ──────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// ─── Context shape ────────────────────────────────────────────────────────────
export interface MyAttendanceContextType {
  /** Raw flat list of all attendance records. */
  attendances: AttendanceRecord[];
  /** Records grouped into UI categories. */
  categorized: CategorizedAttendances;
  loading: boolean;
  error: string | null;
  /** Manually refresh attendance data. */
  refresh: () => Promise<void>;
}

export const MyAttendanceContext =
  createContext<MyAttendanceContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const MyAttendanceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { token } = useContext(AuthContext);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await AttendanceService.getMyAttendances();
      let records: AttendanceRecord[] = [];

      if (Array.isArray(response)) {
        records = response;
      } else if (response?.attendances) {
        records = response.attendances;
      } else if ((response as any)?.data?.attendances) {
        records = (response as any).data.attendances;
      }

      setAttendances(records);
    } catch (err) {
      console.error("[MyAttendanceContext] refresh error:", err);
      setError("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Categorize (derived, memoized) ─────────────────────────────────────────
  const categorized = useMemo<CategorizedAttendances>(() => {
    const now = new Date();
    const result: CategorizedAttendances = {
      upcoming: [],
      ongoing: [],
      completed: [],
      incomplete: [],
      "no-checkout": [],
      missed: [],
    };

    for (const record of attendances) {
      const category = deriveAttendanceCategory(record, now);
      result[category].push(record);
    }

    return result;
  }, [attendances]);

  // ── Auth-aware fetch: triggers on login ────────────────────────────────────
  useEffect(() => {
    if (!token) return; // skip if no token (null or undefined)
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value: MyAttendanceContextType = {
    attendances,
    categorized,
    loading,
    error,
    refresh,
  };

  return (
    <MyAttendanceContext.Provider value={value}>
      {children}
    </MyAttendanceContext.Provider>
  );
};
