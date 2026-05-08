// /api/AttendanceService.ts
import { AttendanceRecord } from "../types/AttendanceTypes";
import { API_ROUTES } from "./ApiRoutes";
import api from "./AxiosInstance";

export interface LogAttendancePayload {
  session_id: number;
  action_type: "check-in" | "check-out";
  method: string;
  latitude: number;
  longitude: number;
  /** Required when method === "qr". Must be top-level, NOT inside metadata. */
  qr_token?: string;
  metadata?: Record<string, any>;
}

export interface TimeStats {
  hours: number;
  minutes: number;
  seconds: number;
  total_seconds: number;
  total_minutes_decimal: number;
}

export interface AttendanceActionResponse {
  success: boolean;
  live_state: string;
  arrival_status: string;
  result_status: string;
  time_stats: TimeStats;
}

/** Returned by POST /attendances/join */
export interface SessionJoinData {
  session_id: number;
  attendance_id: number;
  session_name: string;
  location: string;
  is_active: boolean;
  allowed_methods: string[];
  status: string;
}

export interface SessionJoinResponse {
  success: boolean;
  message: string;
  data: SessionJoinData;
}

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  action_type: string;
  log_time: string | null;
}

export interface AttendeeLocation {
  attendance_id: number;
  full_name: string;
  checkin: LocationData | null;
  checkout: LocationData | null;
}

export interface SessionLocationResponse {
  success: boolean;
  data: AttendeeLocation[];
}
const AttendanceService = {
  /**
   * Fetches all attendance records for the currently authenticated user.
   * Each record contains a nested session object.
   * Route: GET /attendances/my-attendances
   */
  getMyAttendances: async (): Promise<{ attendances: AttendanceRecord[] }> => {
    const response = await api.get(`${API_ROUTES.ATTENDANCE}/my-attendances`);
    return response.data;
  },

  /**
   * Registers the current user as a participant in a session via session code.
   * This is NOT a check-in — it just creates an attendance record.
   * Route: POST /attendances/join
   */
  registerAttendance: async (session_code: string): Promise<SessionJoinResponse> => {
    const response = await api.post(`${API_ROUTES.ATTENDANCE}/join`, { session_code });
    return response.data;
  },

  /**
   * Performs the actual check-in or check-out using location.
   * Route: POST /attendance/log
   */
  logAttendance: async (payload: LogAttendancePayload): Promise<AttendanceActionResponse> => {
    console.log("\n[AttendanceService] Sending logAttendance Payload to Backend:", JSON.stringify(payload, null, 2), "\n");
    const response = await api.post(`${API_ROUTES.ATTENDANCE}/log`, payload);
    return response.data;
  },

  /**
   * Refreshes the QR code payload for a rotating QR session.
   * Route: POST /sessions/{session_id}/refresh-qr
   */
  refreshQr: async (session_id: number): Promise<{ qr_payload: string }> => {
    const response = await api.post(`/sessions/${session_id}/refresh-qr`);
    return response.data;
  },

  /**
   * Retrieves attendance logs for the current user for a specific session.
   * Route: GET /attendances/session-logs/{session_id}
   */
  getAttendanceLogs: async (session_id: number): Promise<any> => {
    const response = await api.get(`${API_ROUTES.ATTENDANCE}/session-logs/${session_id}`);
    return response.data;
  },

  /**
   * Downloads a PDF attendance report for a specific session.
   * Returns raw arraybuffer data for writing to filesystem.
   * Route: GET /attendances/report/{session_id}
   */
  getAttendanceReport: async (session_id: number): Promise<ArrayBuffer> => {
    const response = await api.get(`${API_ROUTES.ATTENDANCE}/report/${session_id}`, {
      responseType: "arraybuffer",
    });
    return response.data;
  },

  getSessionAttendeeLocations: async (session_id: number): Promise<SessionLocationResponse> => {
  const response = await api.get(`${API_ROUTES.ATTENDANCE}/log-location/${session_id}`);
  return response.data;
}
  
};

export default AttendanceService;
