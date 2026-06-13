import React, { createContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthService } from "../api/AuthService";
import UserService from "../api/UserService";
import api, { clearAuthHeader } from "../api/AxiosInstance";
import { registerPushToken, unregisterPushToken } from "../utils/pushNotifications";

import { Alert } from "react-native";

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 🔄 Load token and validate on app start
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync("access_token");
                if (storedToken) {
                    api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
                    await fetchUser(); 
                    setToken(storedToken);
                }
            } catch (err) {
                console.error("Auth init error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (user_name: string, password: string) => {
        const res = await AuthService.login(user_name, password);
        const { access_token, refresh_token } = res.data.tokens;

        await SecureStore.setItemAsync("access_token", access_token);
        await SecureStore.setItemAsync("refresh_token", refresh_token);
        
        // Inject synchronously to avoid async interceptor delay
        api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

        await fetchUser();
        // Set token state last, which unblocks the rest of the application
        setToken(access_token);

        // Register push token after successful login (non-blocking)
        registerPushToken();
    };

    const signup = async (signupData: any) => {
        const res = await AuthService.signup(signupData);
        const { access_token, refresh_token } = res.data.tokens;

        await SecureStore.setItemAsync("access_token", access_token);
        await SecureStore.setItemAsync("refresh_token", refresh_token);
        
        api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

        await fetchUser();
        setToken(access_token);

        // Register push token after successful signup (non-blocking)
        registerPushToken();
    };

    const fetchUser = async () => {
        try {
            const res = await UserService.getProfile();
            setUser(res);
        } catch (error: any) {
            console.error("Profile fetch error:", error);
            // If we get here, it means both the access token AND refresh token failed/expired
            if (error.response?.status === 401) {
                Alert.alert(
                    "Session Expired",
                    "Your session has expired. Please log in again to continue."
                );
                await logout();
            }
        }
    };


    const logout = async () => {
        try {
            // 🔕 Remove device push token before logout
            await unregisterPushToken();
            // 📞 Try to inform backend about logout
            await AuthService.logout();
        } catch (e) {
            console.warn("Backend logout failed", e);
        } finally {
            // 🧹 CRITICAL: Always wipe local tokens and state
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");
            
            // 🛑 Also clear active Axios headers
            clearAuthHeader();
            
            setUser(null);
            setToken(null);
        }
    };


    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};