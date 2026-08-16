import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  signup as apiSignup,
  login as apiLogin,
  logout as apiLogout,
  fetchCurrentUser,
  type CustomerUser,
} from "@/lib/api";

interface AuthContextValue {
  user: CustomerUser | null;
  loading: boolean;
  signup: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signup: AuthContextValue["signup"] = async (payload) => {
    const { user } = await apiSignup(payload);
    setUser(user);
  };

  const login: AuthContextValue["login"] = async (payload) => {
    const { user } = await apiLogin(payload);
    setUser(user);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user } = await fetchCurrentUser();
      setUser(user);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
