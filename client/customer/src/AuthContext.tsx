import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type PublicUser,
  getSessionUser,
  login as apiLogin,
  registerCustomer as apiRegister,
  logout as apiLogout,
  onForceSignOut
} from "./lib/api";

export interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<PublicUser>;
  register: (payload: { name: string; phone?: string; email?: string; password: string }) => Promise<PublicUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  // a cached profile with no access token is not a session
  const [user, setUser] = useState<PublicUser | null>(getSessionUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  // a 401 that survives refresh ends the session; drop React state too so the
  // route guard redirects to login instead of leaving a dead shell on screen
  useEffect(() => onForceSignOut(() => setUser(null)), []);

  async function login(identifier: string, password: string) {
    const u = await apiLogin(identifier, password);
    setUser(u);
    return u;
  }

  async function register(payload: { name: string; phone?: string; email?: string; password: string }) {
    const u = await apiRegister(payload);
    setUser(u);
    return u;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
