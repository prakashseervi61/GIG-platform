import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";

/* ── Design tokens ─────────────────────────────────────────────── */
const GREEN = "#238B57";        // primary accent
const GREEN_DARK = "#176B45";   // AA-safe green for filled controls + text on light green
const NAVY = "#14213D";
const SECONDARY = "#64748B";
const BG = "#F7FAF8";
const GREEN_SOFT = "#E8F6EF";
const GREEN_LINE = "#D5EADC";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Brand + icons ─────────────────────────────────────────────── */
function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden>
      <circle cx="24" cy="24" r="24" fill={GREEN_SOFT} />
      <circle cx="24" cy="14" r="5" fill={GREEN} />
      <path d="M14 34c0-5.5 4.5-10 10-10s10 4.5 10 10" fill={GREEN} />
      <circle cx="13" cy="20" r="4" fill="#2E9E63" />
      <path d="M5 36c0-4.4 3.6-8 8-8" stroke="#2E9E63" strokeWidth="2.5" fill="none" />
      <circle cx="35" cy="20" r="4" fill="#2E9E63" />
      <path d="M43 36c0-4.4-3.6-8-8-8" stroke="#2E9E63" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <circle cx="7" cy="7" r="3" />
      <path d="M1.8 16.2c0-2.7 2.3-4.7 5.2-4.7s5.2 2 5.2 4.7" />
      <path d="M13.4 4.4a3 3 0 010 5.2M15 11.9c2 .6 3.4 2.3 3.4 4.3" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2.2" />
      <path d="M2.5 8h15M6.5 2.4v3M13.5 2.4v3M6 11.5h2M11 11.5h3M6 14.5h2" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M3 16.5h14" />
      <path d="M5.5 16.5v-4.2M10 16.5V5.8M14.5 16.5v-6.4" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M3 17.5V3.6a1 1 0 011-1h5.5a1 1 0 011 1v13.9" />
      <path d="M10.5 8h4.9a1 1 0 011 1v8.5M2 17.5h16" />
      <path d="M5.6 5.6h2.2M5.6 8.6h2.2M5.6 11.6h2.2M13 11.2h1.4M13 14.2h1.4" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 01-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25h10.638A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/* ── Standard 46px/48px responsive input base ── */
const inputBase =
  "h-11 sm:h-12 w-full rounded-xl border border-slate-300 bg-slate-50 text-[14px] text-[#14213D] " +
  "placeholder:text-slate-400 transition-colors duration-200 focus:outline-none";

function fieldClasses(invalid: boolean) {
  return invalid
    ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
    : "hover:border-slate-400 focus:border-[#238B57] focus:bg-white focus:ring-2 focus:ring-[#238B57]/15";
}

function friendlyError(err: unknown): string {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: unknown }).status)
      : undefined;
  const message = err instanceof Error ? err.message : "Failed to sign in.";
  const m = message.toLowerCase();

  if (
    status === 401 ||
    status === 400 ||
    m.includes("invalid") ||
    m.includes("incorrect") ||
    m.includes("credential") ||
    m.includes("password") ||
    m.includes("unauthorized") ||
    m.includes("not found")
  ) {
    return "Incorrect email or password. Please try again.";
  }
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("request failed")
  ) {
    return "Unable to reach the server. Please try again shortly.";
  }
  return message;
}

type Mode = "login" | "forgot";

const FEATURES = [
  { icon: IconUsers, title: "Manage Workers", copy: "Verify and onboard cooperative workers" },
  { icon: IconCalendar, title: "Track Bookings", copy: "Monitor active and completed jobs" },
  { icon: IconChart, title: "View Analytics", copy: "Demand forecast and real-time insights" },
  { icon: IconBuilding, title: "Manage Cooperatives", copy: "Societies, federations, and services" },
];

export default function Login() {
  const nav = useNavigate();
  const { user, login, logout } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // If already logged in with admin privileges, redirect to dashboard
  useEffect(() => {
    if (user && (user.role === "coop_admin" || user.role === "federation_admin")) {
      nav("/", { replace: true });
    }
  }, [user, nav]);

  function validateEmail(value: string): boolean {
    return EMAIL_RE.test(value.trim());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError({});

    if (!validateEmail(identifier)) {
      setFieldError({ email: "Enter a valid email address." });
      return;
    }
    if (!password) {
      setFieldError({ password: "Password is required." });
      return;
    }

    setBusy(true);
    try {
      const u = await login(identifier.trim(), password);
      // Verify admin role
      if (u.role !== "coop_admin" && u.role !== "federation_admin") {
        await logout();
        setError("Access denied. Only cooperative and federation administrators can access this portal.");
        setBusy(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => nav("/"), 400);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError({});

    if (!validateEmail(identifier)) {
      setFieldError({ email: "Enter a valid email address." });
      return;
    }

    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setForgotSent(true);
    } finally {
      setBusy(false);
    }
  }

  const emailInvalid = Boolean(fieldError.email);
  const pwInvalid = Boolean(fieldError.password);

  return (
    <div
      className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden"
      style={{ background: BG }}
    >
      {/* ══════════ LEFT — Brand / Marketing (Hidden or condensed on mobile, 50-52% on desktop) ══════════ */}
      <aside
        className="relative order-2 flex w-full flex-col overflow-hidden lg:order-1 lg:h-screen lg:w-[50%] xl:w-[52%] lg:shrink-0"
        style={{ background: "linear-gradient(180deg, #FAFDFB 0%, #F2F9F5 55%, #EAF6EF 100%)" }}
      >
        <div className="flex min-h-0 flex-1 flex-col justify-between px-6 py-6 sm:px-8 lg:px-10 xl:px-14">
          {/* Header row — brand left, portal label right */}
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BrandMark size={42} />
                <div className="text-[16px] font-extrabold leading-[1.15]" style={{ color: NAVY }}>
                  Cooperative
                  <br />
                  Gig Services
                </div>
              </div>
              <span
                className="rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ background: GREEN_SOFT, borderColor: GREEN_LINE, color: GREEN_DARK }}
              >
                Admin Portal
              </span>
            </div>

            <p className="mt-2 text-[13px] font-medium" style={{ color: NAVY, opacity: 0.82 }}>
              Trusted Workers. Stronger Communities.
            </p>
            <div className="mt-3 h-[3px] w-10 rounded-full" style={{ background: GREEN }} />
          </div>

          {/* Center message + features */}
          <div className="my-auto py-3">
            <p
              className="max-w-[480px] text-[13.5px] leading-relaxed text-slate-600 sm:text-[14px]"
            >
              A unified cooperative platform connecting certified skilled workers with local opportunities.
            </p>

            {/* 2 × 2 feature grid */}
            <div className="mt-4 grid max-w-[500px] grid-cols-2 gap-2.5 sm:gap-3">
              {FEATURES.map(({ icon: Icon, title, copy }) => (
                <div
                  key={title}
                  className="flex items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-shadow hover:shadow-sm"
                  style={{ borderColor: GREEN_LINE, background: "rgba(255,255,255,0.78)" }}
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: GREEN_SOFT, color: GREEN_DARK }}
                  >
                    <Icon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold leading-tight sm:text-[12.5px]" style={{ color: NAVY }}>
                      {title}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug sm:text-[11.5px]" style={{ color: SECONDARY }}>
                      {copy}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Workforce illustration — gracefully adapts or shrinks on low-height viewports */}
            <div className="mt-4 flex min-h-0 max-h-[140px] items-end justify-center lg:max-h-[170px] xl:max-h-[210px] [@media(max-height:720px)]:max-h-[110px] [@media(max-height:640px)]:hidden">
              <img
                src="/project-team.svg"
                alt="Cooperative administration team collaboration"
                width={787}
                height={428}
                className="h-full w-full select-none object-contain object-bottom"
                draggable={false}
              />
            </div>
          </div>

          {/* Left footer note */}
          <div className="hidden pt-2 lg:block">
            <p className="text-[12px] italic text-slate-500">
              Cooperative Gig Services Administration &bull; State &amp; Federation Level Management
            </p>
          </div>
        </div>

        {/* Bottom quote bar — matched to right column footer */}
        <div
          className="flex h-12 lg:h-14 shrink-0 items-center gap-2 border-t px-6 sm:px-8 lg:px-10 xl:px-14"
          style={{ background: GREEN_SOFT, borderColor: GREEN_LINE }}
        >
          <span className="font-serif text-[22px] leading-none" style={{ color: GREEN_DARK, opacity: 0.6 }}>
            &ldquo;
          </span>
          <p className="truncate text-[12.5px] font-medium sm:text-[13px]" style={{ color: GREEN_DARK }}>
            When communities work together, everyone moves forward.
          </p>
        </div>
      </aside>

      {/* ══════════ RIGHT — Auth Card (50-48% on desktop) ══════════ */}
      <main
        className="order-1 flex min-h-0 flex-1 flex-col overflow-y-auto lg:order-2 lg:h-screen lg:w-[50%] xl:w-[48%] lg:shrink-0"
        style={{ background: "#F8FAFC", animation: "none" }}
      >
        {/* Mobile brand mark (visible only on small screens) */}
        <div className="flex h-12 shrink-0 items-center px-4 sm:px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="text-[14px] font-bold text-slate-800">Admin Portal</span>
          </div>
        </div>

        {/* Card wrapper — perfectly centered vertically and horizontally */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="w-full max-w-[420px]">
            <div
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(20,33,61,0.05)] sm:p-7"
            >
              {mode === "login" ? (
                <>
                  <div>
                    <h2 className="text-[22px] font-bold leading-tight tracking-tight" style={{ color: NAVY }}>
                      Admin Login
                    </h2>
                    <p className="mt-1.5 text-[12.5px] sm:text-[13px]" style={{ color: SECONDARY }}>
                      Sign in to your Cooperative Gig Services account
                    </p>
                  </div>

                  <form onSubmit={submit} className="mt-4 space-y-3.5" noValidate>
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-[12px] font-semibold" style={{ color: NAVY }}>
                        Email Address
                      </label>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                          style={{ color: emailInvalid ? "#DC2626" : "#94A3B8" }}
                        >
                          <IconMail />
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            if (fieldError.email) setFieldError((f) => ({ ...f, email: undefined }));
                            if (error) setError("");
                          }}
                          onBlur={() => {
                            if (identifier && !validateEmail(identifier)) {
                              setFieldError({ email: "Enter a valid email address." });
                            }
                          }}
                          placeholder="admin@coop.example"
                          aria-invalid={emailInvalid}
                          aria-describedby={emailInvalid ? "email-error" : undefined}
                          className={`${inputBase} ${fieldClasses(emailInvalid)} pl-10 pr-3.5`}
                        />
                      </div>
                      {emailInvalid && (
                        <p id="email-error" className="mt-1.5 text-[11.5px] font-medium text-red-600" role="alert">
                          {fieldError.email}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="mb-1.5 block text-[12px] font-semibold" style={{ color: NAVY }}>
                        Password
                      </label>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                          style={{ color: pwInvalid ? "#DC2626" : "#94A3B8" }}
                        >
                          <IconLock />
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={showPw ? "text" : "password"}
                          autoComplete="currentPassword"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldError.password) setFieldError((f) => ({ ...f, password: undefined }));
                            if (error) setError("");
                          }}
                          placeholder="Enter your password"
                          aria-invalid={pwInvalid}
                          aria-describedby={pwInvalid ? "password-error" : undefined}
                          className={`${inputBase} ${fieldClasses(pwInvalid)} pl-10 pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={showPw ? "Hide password" : "Show password"}
                          className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showPw ? (
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                              <path
                                fillRule="evenodd"
                                d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z"
                                clipRule="evenodd"
                              />
                              <path d="M10.748 13.93l2.523 2.523a10.003 10.003 0 01-8.516-1.168l1.338-1.338a7.5 7.5 0 004.655-.017zM15.373 11.204l1.297 1.297a10.003 10.003 0 00.9-2.093 1.651 1.651 0 000-1.185 10.004 10.004 0 00-2.197-3.223z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {pwInvalid && (
                        <p id="password-error" className="mt-1.5 text-[11.5px] font-medium text-red-600" role="alert">
                          {fieldError.password}
                        </p>
                      )}
                    </div>

                    {/* Remember + Forgot */}
                    <div className="flex items-center justify-between text-[12.5px]">
                      <label
                        className="flex cursor-pointer select-none items-center gap-2 font-medium"
                        style={{ color: NAVY }}
                      >
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                          style={{ accentColor: GREEN_DARK }}
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setError("");
                          setFieldError({});
                          setForgotSent(false);
                        }}
                        className="font-semibold transition-colors hover:underline"
                        style={{ color: GREEN_DARK }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    {/* Form-level error */}
                    {error && (
                      <div
                        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12px] font-medium text-red-700"
                        role="alert"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden>
                          <path
                            fillRule="evenodd"
                            d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm7.25-3.25a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 6a.75.75 0 100-1.5.75.75 0 000 1.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="flex-1">{error}</span>
                      </div>
                    )}

                    {/* Primary action */}
                    <button
                      type="submit"
                      disabled={busy || success}
                      className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl text-[14.5px] font-semibold text-white transition-all duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238B57]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        background: GREEN_DARK,
                        boxShadow: "0 2px 10px rgba(23,107,69,0.24)",
                      }}
                    >
                      {busy ? (
                        <>
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                          Logging in&hellip;
                        </>
                      ) : success ? (
                        <>
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Redirecting to dashboard&hellip;
                        </>
                      ) : (
                        <>
                          Login
                          <IconArrowRight />
                        </>
                      )}
                    </button>

                    {/* Demo auto-fill helpers */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">Demo Fill:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIdentifier("federation@coop.example");
                            setPassword("admin@12345");
                            setError("");
                            setFieldError({});
                          }}
                          className="rounded bg-emerald-100/70 px-1.5 py-0.5 font-semibold text-emerald-800 transition-colors hover:bg-emerald-200/80"
                        >
                          Federation Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdentifier("coimbatore.admin@coop.example");
                            setPassword("admin@12345");
                            setError("");
                            setFieldError({});
                          }}
                          className="rounded bg-slate-200/70 px-1.5 py-0.5 font-semibold text-slate-700 transition-colors hover:bg-slate-300/80"
                        >
                          Coop Admin
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 pt-0.5">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[11.5px] uppercase tracking-wider text-slate-400">
                        or
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Microsoft SSO */}
                    <button
                      type="button"
                      className="flex h-11 sm:h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white text-[13.5px] font-semibold text-[#14213D] transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238B57]/30"
                    >
                      <MicrosoftLogo />
                      Login with Microsoft
                    </button>
                  </form>
                </>
              ) : (
                /* ── Forgot-password state ── */
                <>
                  <div>
                    <h2 className="text-[22px] font-bold leading-tight tracking-tight" style={{ color: NAVY }}>
                      Reset your password
                    </h2>
                    <p className="mt-1 text-[12.5px] sm:text-[13px]" style={{ color: SECONDARY }}>
                      Enter your admin email address to receive a recovery link
                    </p>
                  </div>

                  {forgotSent ? (
                    <div className="mt-4 space-y-3.5 text-center">
                      <div
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ background: GREEN_SOFT, color: GREEN_DARK }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 7l-10 7L2 7" />
                        </svg>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-slate-600">
                        If an account exists for{" "}
                        <span className="font-semibold text-slate-900">
                          {identifier.trim()}
                        </span>
                        , a password reset link has been sent. Check your inbox.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setForgotSent(false);
                          setError("");
                        }}
                        className="flex h-11 sm:h-12 w-full items-center justify-center rounded-xl text-[14px] font-semibold text-white transition-all hover:brightness-105"
                        style={{ background: GREEN_DARK }}
                      >
                        Back to login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={submitForgot} className="mt-4 space-y-3.5" noValidate>
                      <div>
                        <label htmlFor="forgot-email" className="mb-1.5 block text-[12px] font-semibold" style={{ color: NAVY }}>
                          Email Address
                        </label>
                        <div className="relative">
                          <span
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                            style={{ color: emailInvalid ? "#DC2626" : "#94A3B8" }}
                          >
                            <IconMail />
                          </span>
                          <input
                            id="forgot-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            value={identifier}
                            onChange={(e) => {
                              setIdentifier(e.target.value);
                              if (fieldError.email) setFieldError({});
                              if (error) setError("");
                            }}
                            placeholder="admin@coop.example"
                            aria-invalid={emailInvalid}
                            className={`${inputBase} ${fieldClasses(emailInvalid)} pl-10 pr-3.5`}
                          />
                        </div>
                        {emailInvalid && (
                          <p className="mt-1.5 text-[11.5px] font-medium text-red-600" role="alert">
                            {fieldError.email}
                          </p>
                        )}
                      </div>

                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12px] font-medium text-red-700" role="alert">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-all hover:brightness-105 disabled:opacity-70"
                        style={{ background: GREEN_DARK, boxShadow: "0 2px 10px rgba(23,107,69,0.24)" }}
                      >
                        {busy ? (
                          <>
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                            Sending&hellip;
                          </>
                        ) : (
                          "Send reset link"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setError("");
                          setFieldError({});
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
                      >
                        <IconArrowLeft />
                        Back to login
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer — pixel-aligned with left column footer */}
        <div
          className="flex h-12 lg:h-14 shrink-0 flex-col items-center justify-center border-t border-slate-200 bg-slate-50 px-4 text-center sm:px-6 lg:px-8"
        >
          <p className="text-[11.5px] text-slate-500">
            For authorized cooperative personnel only &bull; &copy; 2026 Cooperative Gig Services
          </p>
        </div>
      </main>
    </div>
  );
}
