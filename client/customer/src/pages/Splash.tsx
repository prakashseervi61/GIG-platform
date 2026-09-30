import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

/* ── hero illustration: trusted workers + community ── */
function HeroArt() {
  return (
    <svg viewBox="0 0 340 175" className="h-auto w-full" role="img" aria-label="Verified local workers in a community">
      {/* soft ground */}
      <ellipse cx="170" cy="148" rx="152" ry="26" fill="#d8ecd9" />
      {/* sun */}
      <circle cx="296" cy="34" r="21" fill="#b3d9ba" />
      {/* house left */}
      <path d="M36 88 L74 56 L112 88 Z" fill="#2c6e49" />
      <rect x="44" y="88" width="60" height="54" rx="4" fill="#ffffff" stroke="#d8ecd9" strokeWidth="3" />
      <rect x="66" y="110" width="17" height="32" rx="2" fill="#22573a" />
      <rect x="50" y="98" width="13" height="13" rx="2" fill="#b3d9ba" />
      {/* house right */}
      <path d="M232 96 L258 74 L284 96 Z" fill="#5ba075" />
      <rect x="238" y="96" width="40" height="46" rx="4" fill="#ffffff" stroke="#d8ecd9" strokeWidth="3" />
      <rect x="250" y="112" width="14" height="30" rx="2" fill="#22573a" />
      {/* tree */}
      <rect x="14" y="112" width="7" height="30" rx="3" fill="#22573a" />
      <circle cx="17" cy="104" r="16" fill="#86bf96" />

      {/* trusted badge */}
      <path d="M170 34 L192 42 v16 c0 13 -10 22 -22 27 c-12 -5 -22 -14 -22 -27 V42 Z" fill="#ffffff" stroke="#2c6e49" strokeWidth="3" />
      <path d="M160 58 l7 7 l14 -15" fill="none" stroke="#2c6e49" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* worker 1 — electrician */}
      <rect x="146" y="134" width="11" height="24" rx="5" fill="#1a2332" />
      <rect x="161" y="134" width="11" height="24" rx="5" fill="#1a2332" />
      <rect x="140" y="98" width="39" height="42" rx="11" fill="#2c6e49" />
      <rect x="174" y="104" width="9" height="26" rx="4.5" fill="#2c6e49" transform="rotate(-22 178 117)" />
      <circle cx="159" cy="86" r="12" fill="#f6c9a5" />
      <path d="M145 84 a14 12 0 0 1 28 0 Z" fill="#f2b705" />
      <rect x="143" y="82" width="32" height="5" rx="2.5" fill="#d99e00" />
      {/* wrench */}
      <rect x="182" y="112" width="18" height="5" rx="2.5" fill="#718096" transform="rotate(-30 191 114)" />

      {/* worker 2 — plumber */}
      <rect x="198" y="134" width="11" height="24" rx="5" fill="#1a2332" />
      <rect x="213" y="134" width="11" height="24" rx="5" fill="#1a2332" />
      <rect x="192" y="98" width="39" height="42" rx="11" fill="#0d9488" />
      <rect x="184" y="104" width="9" height="26" rx="4.5" fill="#0d9488" transform="rotate(20 188 117)" />
      <circle cx="211" cy="86" r="12" fill="#f6c9a5" />
      <path d="M197 84 a14 12 0 0 1 28 0 Z" fill="#f2b705" />
      <rect x="195" y="82" width="32" height="5" rx="2.5" fill="#d99e00" />
      {/* pipe */}
      <path d="M172 118 h10 a7 7 0 0 1 7 7 v6" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/* ── category illustrations (icon only, no labels) ── */
function BoltArt() {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" role="img" aria-label="Electrical">
      <path d="M25 5 L13 25 h8 l-3 14 13 -21 h-8 z" fill="#0d9488" />
      <circle cx="34" cy="12" r="2.5" fill="#5eead4" />
      <circle cx="10" cy="33" r="2" fill="#5eead4" />
    </svg>
  );
}
function DropArt() {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" role="img" aria-label="Plumbing">
      <path d="M22 6 C22 6 11 19 11 27 a11 11 0 0 0 22 0 C33 19 22 6 22 6 Z" fill="#2563eb" />
      <path d="M17 28 a5 5 0 0 0 5 5" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
function BroomArt() {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" role="img" aria-label="Cleaning">
      <line x1="32" y1="8" x2="18" y2="26" stroke="#1a2332" strokeWidth="4" strokeLinecap="round" />
      <path d="M11 27 L25 31 L21 40 L7 36 Z" fill="#2c6e49" />
      <line x1="12" y1="34" x2="10" y2="41" stroke="#5ba075" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="36" x2="17" y2="42" stroke="#5ba075" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="35" cy="30" r="2.5" fill="#86bf96" />
    </svg>
  );
}
function HammerArt() {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" role="img" aria-label="Carpentry">
      <line x1="13" y1="34" x2="27" y2="16" stroke="#1a2332" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M23 8 h14 a3 3 0 0 1 3 3 v5 h-20 v-5 a3 3 0 0 1 3 -3 z" fill="#d97706" />
      <rect x="6" y="34" width="14" height="6" rx="3" fill="#2c6e49" />
    </svg>
  );
}

const chips = [
  { Art: BoltArt, bg: "bg-teal-50", ring: "ring-teal-200", delay: "1.1s", phase: "0s" },
  { Art: DropArt, bg: "bg-sky-50", ring: "ring-sky-200", delay: "1.25s", phase: "0.5s" },
  { Art: BroomArt, bg: "bg-green-50", ring: "ring-green-200", delay: "1.4s", phase: "1s" },
  { Art: HammerArt, bg: "bg-amber-50", ring: "ring-amber-200", delay: "1.55s", phase: "1.5s" }
];

export default function Splash() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const go = (path: string) => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => navigate(path), 400);
  };

  return (
    <div
      className={
        "relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white" +
        (leaving ? " anim-out" : "")
      }
    >
      {/* soft animated glow */}
      <div
        aria-hidden
        className="anim-glow pointer-events-none absolute -top-32 right-[-15%] h-72 w-72 rounded-full bg-brand-200/50 blur-3xl"
        style={{ animationDelay: "0.3s" }}
      />
      <div
        aria-hidden
        className="anim-glow pointer-events-none absolute bottom-[-10%] left-[-20%] h-64 w-64 rounded-full bg-teal-200/40 blur-3xl"
        style={{ animationDelay: "3.5s" }}
      />

      {/* ── brand mark ── */}
      <div
        className="anim-scale-in relative z-10 mt-12 px-6"
        style={{ animationDelay: "0.1s" }}
      >
        <span className="text-2xl font-extrabold tracking-tight text-navy">CoopGig</span>
      </div>

      {/* ── hero illustration ── */}
      <div className="anim-fade-up relative z-10 mt-6 px-6" style={{ animationDelay: "0.28s" }}>
        <HeroArt />
      </div>

      {/* ── supporting copy ── */}
      <p
        className="anim-fade-up relative z-10 mt-5 max-w-sm px-6 text-sm leading-relaxed text-navy-600"
        style={{ animationDelay: "0.44s" }}
      >
        Book verified electricians, plumbers, carpenters, cleaners and more — local
        cooperative workers you can trust, at fair prices.
      </p>

      {/* ── floating category illustrations ── */}
      <div className="anim-fade-up relative z-10 mt-6 flex gap-3 px-6" style={{ animationDelay: "1.1s" }}>
        {chips.map((c, i) => (
          <span key={i} className="anim-fade-up" style={{ animationDelay: c.delay }}>
            <span
              className={`anim-float flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${c.bg} ${c.ring}`}
              style={{ animationDelay: c.phase }}
            >
              <c.Art />
            </span>
          </span>
        ))}
      </div>

      {/* ── spacer ── */}
      <div className="flex-1" />

      {/* ── CTA area ── */}
      <div className="relative z-10 space-y-3 px-6 pb-8">
        <button
          onClick={() => go(user ? "/" : "/login?mode=register")}
          className="splash-shimmer anim-fade-up flex h-14 w-full items-center justify-center rounded-2xl bg-brand-600 text-base font-bold text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-[0.97]"
          style={{ animationDelay: "1.85s" }}
        >
          {user ? "Continue" : "Get Started"}
        </button>

        <p
          className="anim-fade-up pb-2 text-center text-xs text-navy-400"
          style={{ animationDelay: "2s" }}
        >
          Already have an account?{" "}
          <button
            onClick={() => go("/login")}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
