import api from "./AxiosInstance";
import { API_ROUTES } from "./ApiRoutes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeviceRegisterInput {
  push_token: string;
  platform: "ios" | "android";
  device_name?: string;
}

export interface DeviceUpdateInput {
  old_token: string;
  new_token: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const UserDeviceService = {
  /**
   * Registers the device push token after login.
   * Route: POST /user-device/register
   */
  registerDevice: async (
    payload: DeviceRegisterInput
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(
      `${API_ROUTES.USER_DEVICES}/register`,
      payload
    );
    return response.data;
  },

  /**
   * Updates push token when Expo generates a new one.
   * Route: PATCH /user-device/update-token
   */
  updateToken: async (
    payload: DeviceUpdateInput
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.patch(
      `${API_ROUTES.USER_DEVICES}/update-token`,
      payload
    );
    return response.data;
  },

  /**
   * Removes push token on logout.
   * Route: DELETE /user-device/remove-device-token
   */
  removeDeviceToken: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(
      `${API_ROUTES.USER_DEVICES}/remove-device-token`
    );
    return response.data;
  },
};

export default UserDeviceService;