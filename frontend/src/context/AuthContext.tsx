import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/services";
import type { User } from "../types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("sims_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const existing = localStorage.getItem("sims_token");
      if (!existing) {
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.me();
        setUser(res.data.user);
        setToken(existing);
      } catch {
        localStorage.removeItem("sims_token");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password });
    const nextToken = res.data.token;
    localStorage.setItem("sims_token", nextToken);
    setToken(nextToken);
    setUser(res.data.user);
  };

  const refreshMe = async () => {
    const res = await authApi.me();
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("sims_token");
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
};
