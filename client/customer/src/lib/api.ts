const API_BASE = import.meta.env.VITE_API_URL || "";
const ACCESS_KEY = "cg_access";
const REFRESH_KEY = "cg_refresh";
const USER_KEY = "cg_user";

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
  // the cached profile must not outlive the tokens, or the app renders as
  // signed-in while every request 401s
  localStorage.removeItem(USER_KEY);
}

export function getUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: PublicUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * The cached profile is only trustworthy while an access token exists. Without
 * this guard a stale cg_user makes the app look signed-in after the tokens are
 * gone, and every request 401s with no way back to the login screen.
 */
export function getSessionUser(): PublicUser | null {
  return getTokens().access ? getUser() : null;
}

const signOutListeners = new Set<() => void>();

/** Notified when a request is rejected and the session is force-ended. */
export function onForceSignOut(fn: () => void) {
  signOutListeners.add(fn);
  return () => {
    signOutListeners.delete(fn);
  };
}

function forceSignOut() {
  clearTokens();
  for (const fn of signOutListeners) fn();
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

/** Seconds before expiry at which we proactively refresh. */
const REFRESH_SKEW_SECONDS = 90;

function expiresInSeconds(token: string | null): number | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === "number" ? exp - Math.floor(Date.now() / 1000) : null;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refresh tokens are single-use: the backend deletes them on rotation, so two
 * concurrent refreshes race and the loser invalidates the session. Every caller
 * must share one in-flight refresh.
 */
function refreshAccess(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
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
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
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
  let { access } = getTokens();

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

  // refresh before the token lapses so a normal request never 401s
  if (auth && expiresInSeconds(access) !== null && expiresInSeconds(access)! < REFRESH_SKEW_SECONDS) {
    if (await refreshAccess()) ({ access } = getTokens());
  }

  let res = await doFetch(auth ? access : null);

  if (auth && res.status === 401 && (await refreshAccess())) {
    ({ access } = getTokens());
    res = await doFetch(access);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = (data?.error ?? {}) as { code?: string; message?: string; details?: unknown };
    // Only drop the session when the token is genuinely rejected. A 401 that
    // survived a successful refresh means the account was signed out or the
    // token revoked elsewhere - not simply a role/permission check.
    if (signoutOn401 && res.status === 401 && (err.code === "TOKEN_MISSING" || err.code === "TOKEN_INVALID")) {
      forceSignOut();
    }
    throw new ApiError(res.status, err.code || "REQUEST_FAILED", err.message || `Request failed (${res.status})`, err.details);
  }
  return data;
}

export const api = {
  get: (path: string, query?: Query, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "GET", query }),
  post: (path: string, body?: unknown, opts?: Partial<RequestOptions>) => request(path, { ...opts, method: "POST", body }),
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