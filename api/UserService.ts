import { API_ROUTES } from "./ApiRoutes";
import api from "./AxiosInstance";

export interface User {
  user_id: number;
  user_name: string;
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
}

const UserService = {
  /** Fetch the authenticated user's profile. Route: GET /users/me */
  getMyProfile: async (): Promise<User> => {
    const response = await api.get(`${API_ROUTES.USERS}/me`);
    return response.data;
  },

  /** Alias used by AuthContext on login/refresh. */
  getProfile: async (): Promise<User> => {
    const response = await api.get(`${API_ROUTES.USERS}/me`);
    return response.data;
  },

  /** Update the authenticated user's profile. Route: PUT /users/me */
  updateProfile: async (profileData: Partial<User>): Promise<User> => {
    const response = await api.put(`${API_ROUTES.USERS}/me`, profileData);
    return response.data;
  },
};

export default UserService;