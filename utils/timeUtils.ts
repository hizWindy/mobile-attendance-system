// /utils/timeUtils.ts
import { AttendanceCategory, AttendanceRecord } from "@/types/AttendanceTypes";
import { BackendSession } from "@/types/SessionTypes";

export const formatTime12hr = (time24: string): string => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};

/**
 * Formats a duration in MINUTES into a human-readable string.
 * Used for session required_time_rendered (stored in minutes).
 */
export const formatDuration = (minutes?: number | null): string | null => {
  if (!minutes && minutes !== 0) return null;
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  const hrs = minutes / 60;
  const isWhole = Number.isInteger(hrs);
  const hLabel = isWhole ? hrs : hrs.toFixed(1);
  return `${hLabel} hr${hrs !== 1 ? "s" : ""}${!isWhole ? ` (${minutes} mins)` : ""}`;
};

/**
 * Formats a duration in SECONDS into a human-readable adaptive string.
 * Used for total_time_rendered (stored in seconds from backend).
 * Examples:
 *   45      → "45 seconds"
 *   120     → "2 minutes"
 *   3665    → "1 hour 1 minute"
 */
export const formatSeconds = (totalSeconds?: number | null): string | null => {
  if (totalSeconds === null || totalSeconds === undefined) return null;
  if (totalSeconds < 60) return `${totalSeconds} second${totalSeconds !== 1 ? "s" : ""}`;
  const totalMins = Math.floor(totalSeconds / 60);
  if (totalMins < 60) return `${totalMins} minute${totalMins !== 1 ? "s" : ""}`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const hrLabel = `${hrs} hour${hrs !== 1 ? "s" : ""}`;
  if (mins === 0) return hrLabel;
  return `${hrLabel} ${mins} minute${mins !== 1 ? "s" : ""}`;
};

/**
 * Determines if a session is "One-Time" or "Long-Term" based on its dates.
 * Long-term means the span is >= 1 calendar day apart.
 */
export const getSessionTerm = (
  session: BackendSession,
): { label: string; isLongTerm: boolean } => {
  if (session.schedule?.start_date && session.schedule?.end_date) {
    const start = new Date(session.schedule.start_date);
    const end = new Date(session.schedule.end_date);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 1) {
        return { label: "Long-Term", isLongTerm: true };
      }
    }
  }
  return { label: "One-Time", isLongTerm: false };
};

/**
 * Custom Frontend status logic replacing the backend.
 * Evaluates current time limits and recurring span.
 * Returns: "past" | "active" | "upcoming" | "on_break"
 */
export const getSessionTimeStatus = (
  session: BackendSession,
): "past" | "active" | "upcoming" | "on_break" => {
  const schedule = session.schedule;
  if (!schedule) return "upcoming";

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = schedule.start_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = schedule.end_time.split(':').map(Number);
  let endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;

  const isRecurring = schedule.type !== "one-time";

  // Completely past the entire session range
  if (schedule.end_date && todayStr > schedule.end_date) {
    return "past";
  }

  // Not yet reached the first day of the range
  if (schedule.start_date && todayStr < schedule.start_date) {
    return "upcoming";
  }

  // Today is within the [start_date, end_date] range.
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return "active";
  } else if (currentMinutes < startMinutes) {
    return "upcoming";
  } else {
    // Session occurrence is over for TODAY.
    if (isRecurring && schedule.end_date && todayStr < schedule.end_date) {
      return "on_break";
    }
    return "past"; // Use "past" as the equivalent for "done"
  }
};

/**
 * Smart end-date rollover for one-time sessions.
 *
 * Problem: If start_time = "23:30" and end_time = "01:00", the session
 * crosses midnight, so end_date must be start_date + 1 day.
 *
 * Only applied when scheduleType === "one-time".
 *
 * @param startDate  - ISO date string, e.g. "2026-04-09"
 * @param startTime  - 24h time string, e.g. "23:30"
 * @param endTime    - 24h time string, e.g. "01:00"
 * @returns Correct end date as an ISO date string.
 */
export const computeEndDate = (
  startDate: string,
  startTime: string,
  endTime: string,
): string => {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // If end is before start → session crosses midnight → roll end date forward
  if (endMinutes < startMinutes) {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }

  return startDate;
};

/**
 * Calculates session duration in minutes based on start and end time strings.
 * Assumes 24h format (HH:mm) and safely handles midnight crossovers.
 */
export const computeDurationMinutes = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  
  if (isNaN(startH) || isNaN(endH)) return 0;

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Rollover to next day
  }

  return endMinutes - startMinutes;
};

/**
 * Derives a UI-friendly attendance category for a single record.
 *
 * Logic:
 * - upcoming  → session hasn't started yet
 * - ongoing   → session is active AND user has checked in (or is expected to)
 * - completed → session has ended AND user has a presence record (present/late)
 * - missed    → session has ended AND user never checked in (absent/pending)
 *
 * @param record  - The attendance record (with nested session)
 * @param now     - Current date for testability (defaults to new Date())
 */
export const deriveAttendanceCategory = (
  record: AttendanceRecord,
  now: Date = new Date(),
): AttendanceCategory => {
  const { session, result_status, live_state, has_checked_out } = record;
  const schedule = session?.schedule;

  if (!schedule) return "upcoming";

  const startDateTime = new Date(`${schedule.start_date}T${schedule.start_time}:00`);
  const endDateTime = new Date(`${schedule.end_date}T${schedule.end_time}:00`);

  const sessionEnded = now > endDateTime;
  const sessionStarted = now >= startDateTime;

  // 1. Check if user fully finalized the flow:
  // (Either checked out early causing result_status, OR session ended evaluating result_status)
  // We use result_status ONLY after session lifecycle ends OR if user checked out.
  const isCheckedOut = has_checked_out || live_state === "checked-out";
  
  if (sessionEnded || isCheckedOut) {
     // If they NEVER checked in, they completely missed it
     if (!record.check_in_time) return "missed";

     // If they checked in but never checked out, it's a no-checkout
     if (record.live_state === "checked-in" && !isCheckedOut) {
       return "no-checkout";
     }

     // If we reach here, they checked in AND checked out (or the backend explicitly marked a result)
     if (result_status === "complete") return "completed";
     if (result_status === "incomplete") return "incomplete";
     if ((result_status as any) === "no-checkout") return "no-checkout"; // Fallback for legacy backend payload
     
     // Fallbacks if result_status not yet populated directly during transition:
     if (isCheckedOut) return "completed";
     
     return "missed";
  }

  // 2. Real-time active states
  if (!sessionStarted) return "upcoming";
  
  // sessionStarted && !sessionEnded
  return "ongoing";
};

// ── Smart Frequency Assessment Helpers ───────────────────────────────────── //

export const getDaysBetweenDates = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : 0;
};

export const hasWeekdayInRange = (startDate: string, endDate: string, weekdays: string[]): boolean => {
  if (!startDate || !endDate || weekdays.length === 0) return false;
  const totalDays = getDaysBetweenDates(startDate, endDate);
  if (totalDays <= 0) return false;
  if (totalDays >= 7) return true; // A 7 YYYY-MM-DD range always has at least 1 of every day
  
  const startObj = new Date(`${startDate}T00:00:00`);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  for (let i = 0; i < totalDays; i++) {
    const currentDayName = dayNames[startObj.getDay()];
    if (weekdays.includes(currentDayName)) return true;
    startObj.setDate(startObj.getDate() + 1);
  }
  return false;
};
