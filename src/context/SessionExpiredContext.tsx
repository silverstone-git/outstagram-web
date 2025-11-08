
import { createContext, useContext, useState, type ReactNode } from "react";

interface SessionExpiredContextType {
  isSessionExpired: boolean;
  showSessionExpiredDialog: () => void;
  hideSessionExpiredDialog: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextType | undefined>(undefined);

export function useSessionExpired() {
  const context = useContext(SessionExpiredContext);
  if (!context) {
    throw new Error("useSessionExpired must be used within a SessionExpiredProvider");
  }
  return context;
}

interface SessionExpiredProviderProps {
  children: ReactNode;
}

export function SessionExpiredProvider({ children }: SessionExpiredProviderProps) {
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const showSessionExpiredDialog = () => {
    setIsSessionExpired(true);
  };

  const hideSessionExpiredDialog = () => {
    setIsSessionExpired(false);
    // Here you would typically handle the logout logic, e.g., by redirecting to the login page.
    window.location.href = "/login";
  };

  return (
    <SessionExpiredContext.Provider
      value={{ isSessionExpired, showSessionExpiredDialog, hideSessionExpiredDialog }}
    >
      {children}
    </SessionExpiredContext.Provider>
  );
}
