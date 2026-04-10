import api from "./AxiosInstance";

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
    const response = await api.post("/auth/login", {
      user_name,
      password,
    });
    return response.data;
  },

  // 📝 SIGNUP
  async signup(signupData: SignupData) {
    const response = await api.post("/auth/signup", signupData);
    return response.data;
  },

  // 🔄 REFRESH TOKEN (FIXED)
  async refreshToken(refresh_token: string) {
    const response = await api.post("/auth/refresh", {
      refresh_token, // ✅ send as JSON body (matches backend)
    });
    return response.data;
  },
  
  // 🚪 LOGOUT
  async logout() {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (e) {
      console.warn("Logout request failed:", e);
      return { success: false };
    }
  },

  async getProfile() {
    const response = await api.get("/users/profile");
    return response.data;
  },

  async updateProfile(profileData: any) {
    const response = await api.put("/users/profile", profileData);
    return response.data;
  },
};
