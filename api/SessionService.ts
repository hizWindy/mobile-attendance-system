import { BackendSession } from "../types/SessionTypes";
import api from "./AxiosInstance"; // make sure AxiosInstance handles absolute imports properly or has a .ts/.js

const SessionService = {
  
  // for admin used
  getList: async (): Promise<{ sessions: BackendSession[] }> => {
    const response = await api.get("/sessions/list");
    return response.data;
  },

  // for specific user 
  getMyList : async () : Promise<{ sessions: BackendSession[] }> => {
    const response = await api.get("/sessions/my-sessions");
    return response.data;
  },

  get: async (sessionId: number | string): Promise<BackendSession> => {
    const response = await api.get(`/sessions/get/${sessionId}`);
    return response.data;
  },

  createSession: async (
    sessionData: Partial<BackendSession>,
  ): Promise<BackendSession> => {
    const response = await api.post("/sessions/create", sessionData);
    return response.data;
  },

  updateSession: async (
    sessionId: number | string,
    sessionData: Partial<BackendSession>,
  ): Promise<BackendSession> => {
    const response = await api.put(
      `/sessions/update/${sessionId}`,
      sessionData,
    );
    return response.data;
  },

  deleteSession: async (sessionId: number | string): Promise<any> => {
    const response = await api.delete(`/sessions/delete/${sessionId}`);
    return response.data;
  },
};

export default SessionService;
