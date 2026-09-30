import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../useAuth";

const nav = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M2 10a8 8 0 1116 0A8 8 0 012 10zm8-5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    to: "/bookings",
    label: "Bookings",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: "/workers",
    label: "Workers",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    to: "/forecast",
    label: "Forecast",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
];

function initials(name?: string) {
  if (!name) return "A";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();

  return (
    <div className="min-h-screen lg:flex" style={{ background: "#f4f4f8" }}>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden w-56 shrink-0 flex-col lg:flex"
        style={{ background: "#0d0d14", borderRight: "1px solid #1e1e2e" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid #1e1e2e" }}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#5b5bf6,#a78bfa)" }}
          >
            CG
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white leading-tight">CoopGig</div>
            <div className="text-[10px] font-medium" style={{ color: "#6b6b8a" }}>Admin Console</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#3d3d5c" }}>
            Navigation
          </p>
          {nav.map((item) => {
            const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150"
                style={
                  active
                    ? { background: "#1f1f3a", color: "#a3a3fb" }
                    : { color: "#8888aa" }
                }
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#16162a"; (e.currentTarget as HTMLElement).style.color = "#c4c4fd"; }}
                onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#8888aa"; } }}
              >
                <span style={active ? { color: "#7c7cf8" } : { color: "#4a4a6a" }}>{item.icon}</span>
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "#7c7cf8" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-5" style={{ borderTop: "1px solid #1e1e2e", paddingTop: "16px" }}>
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#5b5bf6,#a78bfa)" }}
            >
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-white">{user?.name ?? "Admin"}</div>
              <div className="truncate text-[10px]" style={{ color: "#6b6b8a" }}>{user?.role?.replace("_", " ")}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 lg:hidden"
          style={{ background: "rgba(13,13,20,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e1e2e" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg,#5b5bf6,#a78bfa)" }}
            >
              CG
            </div>
            <span className="text-sm font-semibold text-white">CoopGig Admin</span>
          </div>
          <div className="flex gap-1">
            {nav.map((item) => {
              const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition"
                  style={active ? { background: "#1f1f3a", color: "#a3a3fb" } : { color: "#6b6b8a" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · CoopGig Admin`;
  }, [title]);
}
