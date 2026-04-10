import axios from "axios";
import * as SecureStore from "expo-secure-store";
const api = axios.create({
  baseURL: "https://weblike-emory-etymologic.ngrok-free.dev/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});


// Attach token automatically
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("access_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ⛔ Avoid infinite loop
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // 🛡️ SKIP refresh for login/signup (these 401s are intentional for wrong credentials)
      const isAuthRequest = originalRequest.url.includes("/auth/login") || 
                           originalRequest.url.includes("/auth/signup");

      if (isAuthRequest) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // 🚦 Refresh is already in progress, queue this request

        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        if (!refreshToken) throw new Error("Missing refresh token");

        // Use core axios to avoid recursion
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;

        if (access_token) {
          await SecureStore.setItemAsync("access_token", access_token);
          api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          processQueue(null, access_token);
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // 🚨 CRITICAL: Clear tokens if refresh fails
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);



export const clearAuthHeader = () => {
  delete api.defaults.headers.common["Authorization"];
};

export default api;

