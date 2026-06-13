import api from "./AxiosInstance";
import { API_ROUTES } from "./ApiRoutes";

export interface SignupData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  user_name: string;
  email: string;
  password: string;
}

export const AuthService = {

  // 🔐 LOGIN
  async login(user_name: string, password: string) {
    const response = await api.post(`${API_ROUTES.AUTH}/login`, {
      user_name,
      password,
    });
    return response.data;
  },

  // 📝 SIGNUP
  async signup(signupData: SignupData) {
    const response = await api.post(`${API_ROUTES.AUTH}/signup`, signupData);
    return response.data;
  },

  // 🔄 REFRESH TOKEN (FIXED)
  async refreshToken(refresh_token: string) {
    const response = await api.post(`${API_ROUTES.AUTH}/refresh`, {
      refresh_token, // ✅ send as JSON body (matches backend)
    });
    return response.data;
  },
  
  // 🚪 LOGOUT
  async logout() {
    try {
      const response = await api.post(`${API_ROUTES.AUTH}/logout`);
      return response.data;
    } catch (e) {
      console.warn("Logout request failed:", e);
      return { success: false };
    }
  }
};
