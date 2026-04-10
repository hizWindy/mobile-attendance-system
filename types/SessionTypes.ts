// /types/SessionTypes.ts

export type SessionStatus = "upcoming" | "action-now" | "completed" | "missed" | "active" | "past";

export interface SessionLocation {
  name?: string;
  room?: string;
  floor?: string;
  radius?: number;
  address?: string;
  building?: string;
  latitude?: number | string;
  longitude?: number | string;
  link?: string;       // for remote sessions
  platform?: string;   // for remote sessions
  passcode?: string;
}

export interface SessionSchedule {
  type: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  grace_period_minutes?: number;
  required_duration_rendered?: number;
}

export interface SessionDetails {
  agenda?: string;
  topic?: string;
  trainer?: string;
  instructor?: string;
  host?: string;
  speaker?: string;
  note?: string;
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
  details: SessionDetails;
  required_time_rendered: number;
  user_role_id: number;
  role_type: "Attendee" | "Supervisors"; // Matching sample JSON
  attended: boolean;
}