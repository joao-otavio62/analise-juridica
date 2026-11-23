import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, SESSION_EXPIRED, tokens } from "../api/client";

interface AuthValue {
  authenticated: boolean;
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearExpiredNotice: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => !!tokens.access);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => { setAuthenticated(false); setSessionExpired(true); };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post("/auth/login", { username, password });
    tokens.set(data.access, data.refresh);
    setSessionExpired(false);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokens.refresh;
    try {
      if (refresh) await api.post("/auth/logout", { refresh }); // invalida o refresh no servidor
    } catch { /* encerra localmente mesmo assim */ }
    tokens.clear();
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ authenticated, sessionExpired, login, logout, clearExpiredNotice: () => setSessionExpired(false) }),
    [authenticated, sessionExpired, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
