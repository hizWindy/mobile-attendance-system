import { BackendSession } from "@/types/SessionTypes";

/**
 * Formats a duration in minutes into a human-readable string.
 * Example: 45 -> "45 mins", 60 -> "1 hr", 90 -> "1.5 hrs (90 mins)"
 */
export const formatDuration = (minutes?: number | null): string | null => {
  if (!minutes && minutes !== 0) return null;
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  const hrs = minutes / 60;
  const isWhole = Number.isInteger(hrs);
  const hLabel = isWhole ? hrs : hrs.toFixed(1);
  return `${hLabel} hr${hrs !== 1 ? 's' : ''}${!isWhole ? ` (${minutes} mins)` : ''}`;
};

/**
 * Determines if a session is "One-Time" or "Long-Term" based on its dates.
 * Long term is multi-day (e.g. 1 week, 3 days, 2 days).
 */
export const getSessionTerm = (session: BackendSession): { label: string; isLongTerm: boolean } => {
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
 * Categorizes a session's current status based on the current time and its schedule.
 * Returns: "past", "active", "upcoming"
 */
export const getSessionTimeStatus = (session: BackendSession): "past" | "active" | "upcoming" => {
  const now = new Date();
  const schedule = session.schedule;
  if (!schedule) return "upcoming";

  const startDateTime = new Date(`${schedule.start_date}T${schedule.start_time}:00`);
  const endDateTime = new Date(`${schedule.end_date}T${schedule.end_time}:00`);

  if (now > endDateTime) {
    return "past";
  } else if (now >= startDateTime && now <= endDateTime) {
    return "active";
  } else {
    return "upcoming";
  }
};


