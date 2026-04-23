// /types/SessionTypes.ts

export type SessionStatus =
  | "upcoming"
  | "active"
  | "on_break"
  | "past";

/** All valid schedule repetition types. */
export type ScheduleType =
  | "one-time"
  | "daily"
  | "weekly"
  | "every_n_days"
  | "semestral"
  | "custom";

export interface SessionLocation {
  name?: string;
  room?: string;
  floor?: string;
  radius?: number;
  address?: string;
  building?: string;
  latitude?: number | string;
  longitude?: number | string;
  link?: string;     // for remote sessions
  platform?: string; // for remote sessions
  passcode?: string;
}

export interface SessionSchedule {
  type: ScheduleType;
  start_time: string;
  end_time: string;
  start_date?: string; // Optional for custom
  end_date?: string;   // Optional for custom
  required_duration_rendered?: number;
  /** For weekly schedules — e.g. ["monday", "wednesday"] */
  days_of_week?: string[];
  /** For every_n_days schedules — repeat every N days */
  interval_days?: number;
  /** For daily and semestral */
  include_weekends?: boolean;
  /** For custom schedules */
  dates?: string[];
}

export interface AttendanceConfig {
  /** Minutes of grace allowed after session start before marking late. */
  grace_period_mins: number;
  /** Minutes after start before a participant is marked absent/missed. */
  absent_limit_mins?: number;
}

export interface QrConfig {
  qr_allowed?: boolean;
  qr_mode: "permanent" | "rotating";
  /** Only applicable when qr_mode === "rotating" */
  refresh_interval_secs?: number;
  /** Only applicable when qr_mode === "rotating" */
  window_secs?: number;
  last_refreshed_at?: number | null;
}

export interface SessionDetails {
  agenda?: string;
  topic?: string;
  trainer?: string;
  instructor?: string;
  host?: string;
  speaker?: string;
  note?: string;
  [key: string]: string | undefined; // allow dynamic extra details
}

export interface BackendSession {
  session_id: number;
  session_code: string;
  session_name: string;
  session_setup: "on_site" | "remote" | "hybrid";
  session_status: SessionStatus;
  methods: string[];
  location: SessionLocation;
  schedule: SessionSchedule;
  details?: SessionDetails;
  attendance_config?: AttendanceConfig;
  qr_config?: QrConfig;
  qr_payload?: string;
  required_time_rendered: number;
  user_role_id: number;
  role_type: "Attendee" | "Supervisors" | "unknown";
  attended: boolean;
}