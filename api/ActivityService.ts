import api from "./AxiosInstance";
import { API_ROUTES } from "./ApiRoutes";

// --- Types ---

export type ActionType =
  | "create_session"
  | "update_session"
  | "delete_session"
  | "join_session"
  | "check_in"
  | "check_out";

export interface ActivityItem {
  activity_id: number;
  user_id: number;
  action_type: ActionType;
  session_id?: number | null;
  attendance_id?: number | null;
  extra_data?: Record<string, any> | null;
  created_at: string;
}

export interface ActivityListResponse {
  success: boolean;
  count: number;
  activities: ActivityItem[];
}

export interface GetActivitiesParams {
  action_type?: ActionType;
  user_id?: number;
  session_id?: number;
  attendance_id?: number;
  limit?: number;
  offset?: number;
}

// --- Service ---

const ActivityService = {
  /**
   * Fetch the current user's own activities.
   * Route: GET /activities/my-activities
   */
  getMyActivities: async (
    limit = 50,
    offset = 0
  ): Promise<ActivityListResponse> => {
    const response = await api.get(`${API_ROUTES.ACTIVITIES}/my-activities`, {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Fetch all activities for a specific session.
   * Route: GET /activities/session/{session_id}
   */
  getSessionActivities: async (
    session_id: number,
    limit = 100,
    offset = 0
  ): Promise<ActivityListResponse> => {
    const response = await api.get(
      `${API_ROUTES.ACTIVITIES}/session/${session_id}`,
      { params: { limit, offset } }
    );
    return response.data;
  },

  /**
   * Fetch all activities with optional filters (admin/supervisor use).
   * Route: GET /activities/list
   */
  getActivities: async (
    params: GetActivitiesParams = {}
  ): Promise<ActivityListResponse> => {
    const response = await api.get(`${API_ROUTES.ACTIVITIES}/list`, {
      params: {
        limit: 100,
        offset: 0,
        ...params,
      },
    });
    return response.data;
  },
};

export default ActivityService;