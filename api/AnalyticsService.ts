import { API_ROUTES } from "./ApiRoutes";
import api from "./AxiosInstance";

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

const AnalyticsService = {
  /**
   * Fetches the high-level aggregate stats for a specific session.
   * Route: GET /analytics/session/stats/{session_id}
   */
  getSessionStats: async (session_id: number): Promise<SessionStats> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/session/${session_id}/stats`    );
    return response.data;
  },

  /**
   * Fetches the list of attendees currently active (on-time, late, no-checkout).
   * Route: GET /analytics/session/live-attendees/{session_id}
   */
  getLiveAttendees: async (session_id: number): Promise<LiveAttendeesResponse> => {
    const response = await api.get(`${API_ROUTES.ANALYTICS}/session/${session_id}/live-attendees`);
    return response.data;
  },
};

export default AnalyticsService;