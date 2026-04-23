// /types/AttendanceTypes.ts

import { BackendSession } from "./SessionTypes";

// ─── Status ───────────────────────────────────────────────────────────────────
/** Derived attendance category used in the UI (not necessarily from backend). */
export type AttendanceCategory =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "incomplete"
  | "no-checkout"
  | "missed";

/** Raw status string returned by the backend for an attendance log. */
export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "pending"
  | "excused"
  | "completed"
  | "incomplete"
  | "on-time";

// ─── Record ───────────────────────────────────────────────────────────────────

export type LiveState = "idle" | "checked-in" | "checked-out";
export type ArrivalStatus = "on-time" | "late" | "missed";
export type ResultStatus = "complete" | "incomplete";

export interface AttendanceRecord {
  attendance_id: number;
  /** ISO datetime the user checked in, or null if not yet. */
  check_in_time: string | null;
  /** ISO datetime the user checked out, or null. */
  check_out_time: string | null;
  /** Duration in seconds the user was present. */
  total_time_rendered: number | null;
  
  /** Current lifecycle state of the attendance */
  live_state: LiveState;
  has_checked_out?: boolean;
  /** Punctuality of arrival. Present if checked-in or missed. */
  arrival_status: ArrivalStatus | null;
  /** Completion outcome. Present if checked-out or expired. */
  result_status: ResultStatus | null;

  /** Backend-reported attendance status. (Legacy) */
  status: AttendanceStatus;
  /** The session this attendance belongs to. */
  session: BackendSession;
}

// ─── Categorized Bucket ───────────────────────────────────────────────────────
/**
 * Attendance records grouped into UI-friendly categories.
 * Derived by `deriveAttendanceCategory()` in timeUtils.
 */
export interface CategorizedAttendances {
  upcoming: AttendanceRecord[];
  ongoing: AttendanceRecord[];
  completed: AttendanceRecord[];
  incomplete: AttendanceRecord[];
  "no-checkout": AttendanceRecord[];
  missed: AttendanceRecord[];
}
