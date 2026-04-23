// /hooks/useSession.ts
import { useContext } from "react";
import {
  MySessionsContext,
  MySessionsContextType,
} from "../context/MySessionsContext";

export const useSession = (): MySessionsContextType => {
  const context = useContext(MySessionsContext);
  if (!context) {
    throw new Error("useSession must be used within a MySessionsProvider");
  }
  return context;
};