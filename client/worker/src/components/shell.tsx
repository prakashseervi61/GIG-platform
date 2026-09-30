import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../useAuth";

const tabs = [
  { to: "/", label: "Jobs", icon: "🧰" },
  { to: "/earnings", label: "Earnings", icon: "💰" },
  { to: "/profile", label: "Profile", icon: "👤" }
];

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  const active = tabs.find((t) => (t.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(t.to)));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-base text-white">🧰</span>
            <div>
              <div className="text-sm font-extrabold leading-none text-slate-900">CoopGig Worker</div>
              <div className="text-[11px] text-slate-400">{user?.name}</div>
            </div>
          </div>
          <Link to="/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
            🔔
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-md">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active?.to === t.to ? "text-brand-700" : "text-slate-400 hover:text-slate-600"}`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}