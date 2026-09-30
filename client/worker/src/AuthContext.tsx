import { createContext, useEffect, useState, type ReactNode } from "react";
import { type PublicUser, getUser, login as apiLogin, registerCustomer as apiRegister, logout as apiLogout } from "./lib/api";

export interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<PublicUser>;
  register: (payload: { name: string; phone?: string; email?: string; password: string }) => Promise<PublicUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

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