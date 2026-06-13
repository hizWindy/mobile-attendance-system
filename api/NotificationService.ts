import api from "./AxiosInstance";
import { API_ROUTES } from "./ApiRoutes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  type:
    | "attendee_joined"
    | "check_in"
    | "check_out"
    | "no_checkout"
    | "session_starting"
    | "session_active"
    | "session_ending"
    | "session_ended";
  is_read: boolean;
  session_id: number | null;
  attendance_id: number | null;
  extra_data: Record<string, any>;
  created_at: string;
}

export interface NotificationListResponse {
  success: boolean;
  count: number;
  data: NotificationItem[];
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const NotificationService = {
  /**
   * Fetches paginated notifications for the current user.
   * Route: GET /notifications/list
   */
  getNotifications: async (
    limit: number = 20,
    offset: number = 0
  ): Promise<NotificationListResponse> => {
    const response = await api.get(`${API_ROUTES.NOTIFICATIONS}/list`, {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Returns the unread notification count.
   * Used for the 🔔 badge on the home screen.
   * Route: GET /notifications/unread-count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await api.get(`${API_ROUTES.NOTIFICATIONS}/unread-count`);
    return response.data;
  },

  /**
   * Marks a single notification as read.
   * Route: PATCH /notifications/{notification_id}/read
   */
  markAsRead: async (notification_id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.patch(
      `${API_ROUTES.NOTIFICATIONS}/${notification_id}/read`
    );
    return response.data;
  },

  /**
   * Marks ALL notifications as read for the current user.
   * Called when user opens the notification screen.
   * Route: PATCH /notifications/read-all
   */
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.patch(`${API_ROUTES.NOTIFICATIONS}/read-all`);
    return response.data;
  },
};

export default NotificationService;