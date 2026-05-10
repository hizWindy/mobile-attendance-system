import { BackendSession } from "../types/SessionTypes";
import api from "./AxiosInstance";
import { API_ROUTES } from "./ApiRoutes";

/** Returned by POST /attendances/join */
export interface SessionJoinData {
  session_id: number;
  attendance_id: number;
  session_name: string;
  location: string;
  is_active: boolean;
  allowed_methods: string[];
  status: string;
  session_setup?: string;
  session_code?: string;
}

export interface SessionJoinResponse {
  success: boolean;
  message: string;
  data: SessionJoinData;
}

const SessionService = {

  // for admin used
  getList: async (): Promise<{ sessions: BackendSession[] }> => {
    const response = await api.get(`${API_ROUTES.SESSIONS}/list`);
    return response.data;
  },

  // for specific user
  getMyList: async (): Promise<{ sessions: BackendSession[] }> => {
    const response = await api.get(`${API_ROUTES.SESSIONS}/my-sessions`);
    return response.data;
  },

  get: async (sessionId: number | string): Promise<BackendSession> => {
    const response = await api.get(`${API_ROUTES.SESSIONS}/get/${sessionId}`);
    return response.data;
  },

  createSession: async (
    sessionData: Partial<BackendSession>,
  ): Promise<BackendSession> => {
    const response = await api.post(`${API_ROUTES.SESSIONS}/create`, sessionData);
    return response.data;
  },

  updateSession: async (
    sessionId: number | string,
    sessionData: Partial<BackendSession>,
  ): Promise<BackendSession> => {
    const response = await api.put(
      `${API_ROUTES.SESSIONS}/update/${sessionId}`,
      sessionData,
    );
    return response.data;
  },

  deleteSession: async (sessionId: number | string): Promise<any> => {
    const response = await api.delete(`${API_ROUTES.SESSIONS}/delete/${sessionId}`);
    return response.data;
  },

  /**
   * Registers the current user as a participant in a session via session code.
   * This is NOT a check-in — it just creates an attendance record.
   * Route: POST /attendances/join
   */
  joinSession: async (session_code: string): Promise<SessionJoinResponse> => {
    const response = await api.post(`${API_ROUTES.SESSIONS}/join`, { session_code });
    return response.data;
  },

  getSessionReport: async (sessionId: number | string): Promise<any> => {
    const response = await api.get(`${API_ROUTES.SESSIONS}/report/${sessionId}`, {
      responseType: "arraybuffer",
    });
    return response.data;
  },
};

export default SessionService;
