import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, Wrench, Bell } from "lucide-react";
import { api } from "../lib/api";
import { initials } from "../lib/format";
import { useAuth } from "../AuthContext";

const tabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/category", label: "Services", Icon: Wrench },
  { to: "/bookings", label: "Bookings", Icon: ClipboardList }
];

export function Shell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => {
    api
      .get("/notifications/unread-count")
      .then((d) => setUnread(Number(d?.unreadCount ?? 0)))
      .catch(() => undefined);
  }, []);
  const active = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname === to || loc.pathname.startsWith(to + "/");

  // Only a real prefix match activates a tab. Several screens deliberately sit
  // outside the three tab roots (service details, worker profiles, payments,
  // emergency), and those must show NO active tab rather than falling back to
  // Home - which used to happen because Math.max(0, -1) resolves to index 0.
  const activeIndex = tabs.findIndex((t) => active(t.to));

  // the bell dot must reflect real unread notifications, not merely "logged in".
  // Re-check whenever the user leaves the notifications screen OR lands back on it
  // after marking things read elsewhere: depending only on the path left the dot
  // stale for the rest of the visit, because "mark all read" does not navigate.
  useEffect(() => {
    refreshUnread();
    // also react to read-state changes made in place on the notifications page,
    // which do not change the route
    window.addEventListener("notifications:read", refreshUnread);
    return () => window.removeEventListener("notifications:read", refreshUnread);
  }, [loc.pathname, refreshUnread]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 py-2">
            <span className="text-lg font-extrabold tracking-tight text-navy">CoopGig</span>
          </Link>
          <div className="flex items-center gap-0.5">
            <Link
              to="/notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-navy-400 active:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[13px] font-extrabold text-brand-800 active:bg-brand-200"
              aria-label="Your profile"
            >
              {initials(user?.name || "Guest")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">{children}</main>

      {/* soft fade so content dissolves behind the floating dock */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-surface via-surface/85 to-transparent"
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
        aria-label="Primary"
      >
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.22)] backdrop-blur-xl">
          <div className="relative flex">
            {/* sliding active pill - only shown when a tab is actually active */}
            {activeIndex >= 0 && (
              <span
                aria-hidden
                className="dock-pill absolute bottom-0 left-0 top-0 w-1/3 rounded-xl bg-brand-50"
                style={{ transform: `translateX(${activeIndex * 100}%)` }}
              />
            )}
            {tabs.map((t) => {
              const isActive = active(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={`dock-item relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold ${
                    isActive ? "text-brand-700" : "text-navy-400"
                  }`}
                >
                  <t.Icon className="dock-icon" size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="dock-label leading-none">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
