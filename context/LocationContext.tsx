// /context/LocationContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import * as Location from "expo-location";
import { AuthContext } from "./AuthContext";

export interface LocationContextType {
  location: Location.LocationObject | null;
  address: string | null;
  errorMsg: string | null;
  loading: boolean;
  refreshLocation: () => Promise<void>;
}

export const LocationContext = createContext<LocationContextType>({} as LocationContextType);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useContext(AuthContext); // Only track location when logged in
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      // Fetch GPS location with balanced accuracy to prevent hanging on Android
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc);

      // Reverse geocode to get human readable address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        
        // Prioritize street name, otherwise use the specific place name
        const street = place.street || place.name;
        // Prioritize neighborhood/district, then city
        const area = place.district || place.subregion || place.city;
        const region = place.region; // e.g. state or province

        const formattedAddress = [street, area, region]
          .filter(Boolean)
          .join(", ");
          
        setAddress(formattedAddress || "Unknown location");
      }
    } catch (error) {
      console.warn("Error fetching location:", error);
      setErrorMsg("Failed to retrieve location");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLocation();
    } else {
      setLocation(null);
      setAddress(null);
    }
  }, [user]);

  return (
    <LocationContext.Provider
      value={{ location, address, errorMsg, loading, refreshLocation: fetchLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
};
