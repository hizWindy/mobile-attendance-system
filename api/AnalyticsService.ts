import { API_ROUTES } from "./ApiRoutes";
import api from "./AxiosInstance";

// ─── Existing Types (unchanged) ───────────────────────────────────────────────

/** Matches SessionStatsResponse from FastAPI */
export interface SessionStats {
  session_id: number;
  total_enrolled: number;
  outcomes: {
    complete: number;
    incomplete: number;
  };
  punctuality: {
    on_time: number;
    late: number;
    missed: number;
  };
  live_count: number;
}

/** Matches LiveAttendeeDetail from FastAPI */
export interface LiveAttendee {
  user_id: number;
  full_name: string;
  status: string;
  check_in_time: string;
}

/** Matches LiveAttendeesResponse from FastAPI */
export interface LiveAttendeesResponse {
  session_id: number;
  count: number;
  attendees: LiveAttendee[];
}

// ─── Supervisor Analytics Types ───────────────────────────────────────────────

export interface SupervisorOverview {
  total_sessions: number;
  active_sessions: number;
  total_enrolled: number;
  overall_completion_rate: number;
  overall_attendance_rate: number;
  overall_on_time_rate: number;
  overall_late_rate: number;
  overall_missed_rate: number;
  total_no_checkout: number;
}

export interface SupervisorSessionItem {
  session_id: number;
  session_name: string;
  session_status: string;
  total_enrolled: number;
  completion_rate: number;
  attendance_rate: number;
  on_time_rate: number;
  late_rate: number;
  missed_rate: number;
  no_checkout_count: number;
  avg_time_rendered_secs: number;
}

export interface SupervisorSessionDetail {
  session_id: number;
  session_name: string;
  session_status: string;
  total_enrolled: number;
  checked_in: number;
  checked_out: number;
  completion_rate: number;
  on_time_rate: number;
  late_rate: number;
  missed_rate: number;
  no_checkout_count: number;
  avg_time_rendered_secs: number;
  required_time_rendered: number;
  outcomes: {
    complete: number;
    incomplete: number;
    missed: number;
    no_checkout: number;
  };
  punctuality: {
    on_time: number;
    late: number;
    missed: number;
  };
}

// ─── Attendee Analytics Types ─────────────────────────────────────────────────

export interface AttendeeOverview {
  total_sessions_joined: number;
  completion_rate: number;
  on_time_rate: number;
  late_rate: number;
  missed_rate: number;
  no_checkout_count: number;
  total_time_rendered_secs: number;
  avg_time_rendered_secs: number;
  current_streak: number;
  longest_streak: number;
}

export interface AttendeeSessionItem {
  session_id: number;
  session_name: string;
  arrival_status: string;
  result_status: string;
  live_state: string;
  total_time_rendered_secs: number;
  required_time_rendered: number;
  completion_percentage: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const AnalyticsService = {
  // ── Existing endpoints (unchanged) ──

  /** GET /analytics/session/{session_id}/stats */
  getSessionStats: async (session_id: number): Promise<SessionStats> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/session/${session_id}/stats`);
    return response.data;
  },

  /** GET /analytics/session/{session_id}/live-attendees */
  getLiveAttendees: async (session_id: number): Promise<LiveAttendeesResponse> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/session/${session_id}/live-attendees`);
    return response.data;
  },

  // ── Supervisor Analytics ──

  /** GET /analytics/supervisor/overview */
  getSupervisorOverview: async (): Promise<{ success: boolean; data: SupervisorOverview }> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/supervisor/overview`);
    return response.data;
  },

  /** GET /analytics/supervisor/sessions */
  getSupervisorSessions: async (): Promise<{ success: boolean; data: SupervisorSessionItem[] }> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/supervisor/sessions`);
    return response.data;
  },

  /** GET /analytics/supervisor/session/{session_id} */
  getSupervisorSessionDetail: async (session_id: number): Promise<{ success: boolean; data: SupervisorSessionDetail }> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/supervisor/session/${session_id}`);
    return response.data;
  },

  // ── Attendee Analytics ──

  /** GET /analytics/attendee/overview */
  getAttendeeOverview: async (): Promise<{ success: boolean; data: AttendeeOverview }> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/attendee/overview`);
    return response.data;
  },

  /** GET /analytics/attendee/sessions */
  getAttendeeSessions: async (): Promise<{ success: boolean; data: AttendeeSessionItem[] }> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/attendee/sessions`);
    return response.data;
  },
};

export default AnalyticsService;
