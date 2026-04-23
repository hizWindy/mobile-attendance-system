// /hooks/useMyAttendance.ts
import { useContext } from "react";
import {
  MyAttendanceContext,
  MyAttendanceContextType,
} from "../context/MyAttendanceContext";

export const useMyAttendance = (): MyAttendanceContextType => {
  const context = useContext(MyAttendanceContext);
  if (!context) {
    throw new Error(
      "useMyAttendance must be used within a MyAttendanceProvider",
    );
  }
  return context;
};
