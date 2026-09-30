import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ── Buttons ── */
const buttonTones: Record<string, string> = {
  primary:   "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-500/20",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
  danger:    "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-400/20",
  ghost:     "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
  green:     "bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/20",
  amber:     "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-400/20",
};

const buttonSizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export function Button({
  tone = "primary", size = "md", loading, className, disabled, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string; size?: string; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        buttonTones[tone] ?? buttonTones.primary,
        buttonSizes[size] ?? buttonSizes.md,
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-3.5 w-3.5" light={tone === "primary" || tone === "danger" || tone === "green"} />}
      {children}
    </button>
  );
}

export function LinkButton({ to, tone = "primary", size = "md", className, children }: { to: string; tone?: string; size?: string; className?: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2",
        buttonTones[tone] ?? buttonTones.primary,
        buttonSizes[size] ?? buttonSizes.md,
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2",
        light ? "border-white/30 border-t-white" : "border-slate-200 border-t-brand-500",
        className ?? "h-4 w-4"
      )}
      aria-label="loading"
    />
  );
}

/* ── Cards ── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]", className)}>
      {children}
    </div>
  );
}

/* ── Page header ── */
export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-brand-600 transition-colors">
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>
      Back
    </Link>
  );
}

/* ── Badges ── */
type BadgeTone = "green" | "amber" | "red" | "slate" | "blue" | "violet" | "indigo";

const badgeTones: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  green:  { bg: "#ecfdf5", text: "#059669", dot: "#10b981" },
  amber:  { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  red:    { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  slate:  { bg: "#f8fafc", text: "#475569", dot: "#94a3b8" },
  blue:   { bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6" },
  violet: { bg: "#f5f3ff", text: "#7c3aed", dot: "#8b5cf6" },
  indigo: { bg: "#eef2ff", text: "#4338ca", dot: "#6366f1" },
};

export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: ReactNode }) {
  const t = badgeTones[tone] ?? badgeTones.slate;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: t.bg, color: t.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.dot }} />
      {children}
    </span>
  );
}

export const bookingTone: Record<string, BadgeTone> = {
  requested:   "amber",
  assigned:    "blue",
  accepted:    "indigo",
  in_progress: "violet",
  completed:   "green",
  cancelled:   "red",
  rejected:    "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={bookingTone[status] ?? "slate"}>{status.replace("_", " ")}</Badge>;
}

/* ── Form fields ── */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "min-h-20 resize-none", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, "cursor-pointer", props.className)} />;
}

/* ── Empty / Error states ── */
export function EmptyState({ icon, title, message, action }: { icon?: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      {icon && <div className="mb-3 text-4xl opacity-60">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {message && <p className="mt-1 max-w-xs text-xs text-slate-400">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, className }: { error: unknown; className?: string }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div
      className={cn("flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600", className)}
      role="alert"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-400">
        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm7.25-3.25a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 6a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
      {msg}
    </div>
  );
}

/* ── Star rating ── */
export function StarRating({ value, onChange, size = "text-base" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", size)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={cn(onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default", star <= value ? "text-amber-400" : "text-slate-200")}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="ml-1 text-xs font-medium text-slate-400">{value.toFixed(1)}</span>}
    </div>
  );
}

/* ── Status stepper ── */
const bookingFlow = ["requested", "assigned", "accepted", "in_progress", "completed"];

export function StatusStepper({ status }: { status: string }) {
  const idx = bookingFlow.indexOf(status);
  return (
    <ol className="flex items-center gap-1">
      {bookingFlow.map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={step} className="flex items-center gap-1">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                done && "bg-brand-600 text-white",
                current && "bg-brand-100 text-brand-700 ring-2 ring-brand-400",
                !done && !current && "bg-slate-100 text-slate-400"
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            {i < bookingFlow.length - 1 && (
              <span className={cn("h-px w-4 sm:w-6", i < idx ? "bg-brand-500" : "bg-slate-200")} />
            )}
          </li>
        );
      })}
      <span className="ml-2 text-xs font-medium capitalize text-slate-500">{status.replace("_", " ")}</span>
    </ol>
  );
}

/* ── Stat card ── */
const statAccents: Record<string, { bar: string; icon: string }> = {
  green:  { bar: "#10b981", icon: "#ecfdf5" },
  amber:  { bar: "#f59e0b", icon: "#fffbeb" },
  red:    { bar: "#ef4444", icon: "#fef2f2" },
  blue:   { bar: "#3b82f6", icon: "#eff6ff" },
  violet: { bar: "#8b5cf6", icon: "#f5f3ff" },
  slate:  { bar: "#94a3b8", icon: "#f8fafc" },
};

export function StatCard({ label, value, icon, tone = "slate" }: { label: string; value: ReactNode; icon?: ReactNode; tone?: string }) {
  const a = statAccents[tone] ?? statAccents.slate;
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.04]">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ background: a.bar }} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: a.icon }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}

/* ── Section heading ── */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[13px] font-semibold text-slate-700">{children}</h2>;
}

/* ── Filter pill group ── */
export function FilterPills({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all",
            value === opt
              ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
              : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300 hover:text-slate-700"
          )}
        >
          {opt.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}

/* ── Data table wrapper ── */
export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</th>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("py-2.5 text-slate-700", className)}>{children}</td>;
}
