"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthSession } from "@/types";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (session: AuthSession | null) => void;
  logout: () => void;
}

const STORAGE_KEY = "finstar_admin_session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const rawSession = window.localStorage.getItem(STORAGE_KEY);
        if (rawSession) {
          setSessionState(JSON.parse(rawSession) as AuthSession);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsHydrated(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const setSession = useCallback((nextSession: AuthSession | null) => {
    setSessionState(nextSession);

    if (nextSession) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    window.location.href = "/admin/login";
  }, [setSession]);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrated,
      setSession,
      logout,
    }),
    [isHydrated, session, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
