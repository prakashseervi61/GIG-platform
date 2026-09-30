const API_BASE = import.meta.env.VITE_API_URL || "";
const ACCESS_KEY = "cg_access";
const REFRESH_KEY = "cg_refresh";

export interface PublicUser {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: "customer" | "worker" | "coop_admin" | "federation_admin";
  language?: string;
  createdAt?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getTokens(): { access: string | null; refresh: string | null } {
  return { access: localStorage.getItem(ACCESS_KEY), refresh: localStorage.getItem(REFRESH_KEY) };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem("cg_user");
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: PublicUser) {
  localStorage.setItem("cg_user", JSON.stringify(user));
}

type QueryValue = string | number | boolean | undefined | null;
type Query = Record<string, QueryValue>;

function buildUrl(path: string, query?: Query) {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return `${API_BASE}/api${path}${qs ? `?${qs}` : ""}`;
}

async function refreshAccess(): Promise<boolean> {
  const { refresh } = getTokens();
  if (!refresh) return false;
  try {
    const res = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh })
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  auth?: boolean;
  signoutOn401?: boolean;
}

async function request(path: string, opts: RequestOptions = {}): Promise<any> {
  const { method = "GET", body, query, auth = true, signoutOn401 = true } = opts;
  const { access } = getTokens();

  const doFetch = async (token?: string | null) => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  };

  let res = await doFetch(auth ? access : null);

  if (auth && res.status === 401 && (await refreshAccess())) {
    const { access: fresh } = getTokens();
    res = await doFetch(fresh);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = data?.error ?? {};
    if (signoutOn401 && res.status === 401) clearTokens();
    throw new ApiError(res.status, err.code || "REQUEST_FAILED", err.message || `Request failed (${res.status})`, err.details);
  }
  return data;
}

export const api = {
  get: (path: string, query?: Query, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "GET", query }),
  post: (path: string, body?: unknown, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "POST", body }),
  put: (path: string, body?: unknown, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "PUT", body }),
  patch: (path: string, body?: unknown, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "PATCH", body }),
  del: (path: string, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "DELETE" })
};

export async function login(identifier: string, password: string) {
  const data = await api.post("/auth/login", { identifier, password }, { auth: false });
  setTokens(data.accessToken, data.refreshToken);
  setUser(data.user);
  return data.user as PublicUser;
}

export async function registerCustomer(payload: { name: string; phone?: string; email?: string; password: string }) {
  const data = await api.post("/auth/register", { ...payload, role: "customer" }, { auth: false });
  setTokens(data.accessToken, data.refreshToken);
  setUser(data.user);
  return data.user as PublicUser;
}

export async function logout() {
  const { refresh } = getTokens();
  try {
    if (refresh) await api.post("/auth/logout", { refreshToken: refresh }, { auth: false, signoutOn401: false });
  } catch {
    /* ignore */
  }
  clearTokens();
}

export function requireUser(user: PublicUser | null): user is PublicUser {
  return Boolean(user);
}