// /hooks/useSessionStatus.ts
//
// Single‑source of truth for evaluating whether a session is active,
// upcoming, or past based on real-time clock comparison.
// Used by AttendanceCard, ParticipateTab, HomeTab, and SessionDetailsModal.

import { BackendSession } from "@/types/SessionTypes";
import { AttendanceRecord } from "@/types/AttendanceTypes";

/**
 * Parse a schedule date+time into a proper Date object.
 * Returns null if the inputs are invalid.
 */
const parseScheduleDate = (date?: string, time?: string): Date | null => {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}:00`);
  return isNaN(dt.getTime()) ? null : dt;
};

// ─── Session-level helpers ────────────────────────────────────────────────────

/**
 * Returns "active" | "upcoming" | "past" for a BackendSession.
 * Always uses `new Date()` so it reflects real clock time.
 */
export const getTimeStatus = (
  session: BackendSession,
): "active" | "upcoming" | "past" => {
  const now = new Date();
  const { schedule } = session;
  if (!schedule) return "upcoming";

  const start = parseScheduleDate(schedule.start_date, schedule.start_time);
  const end   = parseScheduleDate(schedule.end_date,   schedule.end_time);

  if (!start || !end) return "upcoming";
  if (now > end)  return "past";
  if (now >= start) return "active";
  return "upcoming";
};

export const isActive   = (s: BackendSession) => getTimeStatus(s) === "active";
export const isUpcoming = (s: BackendSession) => getTimeStatus(s) === "upcoming";
export const isPast     = (s: BackendSession) => getTimeStatus(s) === "past";

// ─── Attendance-record–level helpers ─────────────────────────────────────────

/**
 * A session is "missed" when its arrival_status is "missed" AND the session is past.
 * If backend hasn't updated it yet, we deduce it if the session is past and the user hasn't checked in.
 */
export const isMissed = (record: AttendanceRecord): boolean => {
  if (record.arrival_status === "missed") return true;
  if (getTimeStatus(record.session) !== "past") return false;
  
  if (record.live_state) return record.live_state === "idle";
  
  // Fallback if live_state is undefined
  return (
    record.status !== "present" &&
    record.status !== "on-time" &&
    record.status !== "late" &&
    record.status !== "completed" &&
    record.status !== "incomplete"
  );
};

/**
 * Whether the user has already checked out of this session.
 */
export const isCheckedOut = (record: AttendanceRecord): boolean => {
  if (record.live_state) return record.live_state === "checked-out";
  return record.status === "completed" || record.status === "incomplete";
};

/**
 * Whether the user checked in but the session ended without a check-out.
 */
export const isNoCheckout = (record: AttendanceRecord): boolean => {
  const timeStatus = getTimeStatus(record.session);
  if (timeStatus !== "past") return false;

  if (record.live_state) return record.live_state === "checked-in";
  
  return (
    record.status === "present" ||
    record.status === "on-time" ||
    record.status === "late"
  );
};

/**
 * Whether a check-in button should be visible for an attendance record.
 */
export const canCheckIn = (record: AttendanceRecord): boolean => {
  if (!isActive(record.session)) return false;
  
  if (record.live_state) return record.live_state === "idle";
  
  if (isCheckedOut(record)) return false;
  return (
    record.status !== "present" &&
    record.status !== "late" &&
    record.status !== "on-time"
  );
};

/**
 * Whether a check-out button should be visible for an attendance record.
 */
export const canCheckOut = (record: AttendanceRecord): boolean => {
  if (!isActive(record.session)) return false;
  
  if (record.live_state) return record.live_state === "checked-in";
  
  if (isCheckedOut(record)) return false;
  return (
    record.status === "present" ||
    record.status === "late" ||
    record.status === "on-time"
  );
};
