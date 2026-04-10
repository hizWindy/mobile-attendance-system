import React, { createContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthService } from "../api/AuthService";
import { clearAuthHeader } from "../api/AxiosInstance";


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
                    setToken(storedToken);
                    // This will fetch user data. 
                    // If expired, AxiosInstance.js will handle refresh automatically.
                    await fetchUser(); 
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
        setToken(access_token);

        await fetchUser();
    };

    const signup = async (signupData: any) => {
        const res = await AuthService.signup(signupData);
        const { access_token, refresh_token } = res.data.tokens;

        await SecureStore.setItemAsync("access_token", access_token);
        await SecureStore.setItemAsync("refresh_token", refresh_token);
        setToken(access_token);

        await fetchUser();
    };

    const fetchUser = async () => {
        try {
            const res = await AuthService.getProfile();
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