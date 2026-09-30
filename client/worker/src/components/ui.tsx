import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const buttonTones: Record<string, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm focus-visible:ring-brand-500",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
  amber: "bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-500"
};

const buttonSizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base"
};

export function Button({ tone = "primary", size = "md", loading, className, disabled, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string; size?: string; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
        buttonTones[tone] ?? buttonTones.primary,
        buttonSizes[size] ?? buttonSizes.md,
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" light />}
      {children}
    </button>
  );
}

export function LinkButton({ to, tone = "primary", size = "md", className, children }: { to: string; tone?: string; size?: string; className?: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
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
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent",
        light && "border-white/40",
        className
      )}
      aria-label="loading"
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
      <span aria-hidden>←</span> Back
    </Link>
  );
}

type BadgeTone = "green" | "amber" | "red" | "slate" | "blue" | "violet";
const badgeTones: Record<BadgeTone, string> = {
  green: "bg-brand-50 text-brand-700 ring-brand-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200"
};

export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", badgeTones[tone] ?? badgeTones.slate)}>
      {children}
    </span>
  );
}

export const bookingTone: Record<string, BadgeTone> = {
  requested: "amber",
  assigned: "blue",
  accepted: "blue",
  in_progress: "violet",
  completed: "green",
  cancelled: "red",
  rejected: "red"
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={bookingTone[status] ?? "slate"}>{status.replace("_", " ")}</Badge>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "min-h-20", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, props.className)} />;
}

export function EmptyState({ icon, title, message, action }: { icon?: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, className }: { error: unknown; className?: string }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className={cn("rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700", className)} role="alert">
      {msg}
    </div>
  );
}

export function StarRating({ value, onChange, size = "text-lg" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", size)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={cn(onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default", star <= value ? "text-amber-400" : "text-slate-300")}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="ml-1 text-xs font-medium text-slate-500">{value.toFixed(1)}</span>}
    </div>
  );
}

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
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                done && "bg-brand-600 text-white",
                current && "bg-brand-100 text-brand-700 ring-2 ring-brand-500",
                !done && !current && "bg-slate-100 text-slate-400"
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            {i < bookingFlow.length - 1 && <span className={cn("h-0.5 w-4 rounded sm:w-7", i < idx ? "bg-brand-600" : "bg-slate-200")} />}
          </li>
        );
      })}
      <span className="ml-2 text-xs font-semibold capitalize text-slate-600">{status.replace("_", " ")}</span>
    </ol>
  );
}

export function StatCard({ label, value, icon, tone = "slate" }: { label: string; value: ReactNode; icon?: ReactNode; tone?: "green" | "amber" | "red" | "slate" | "blue" }) {
  const tones: Record<string, string> = {
    green: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600",
    blue: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-600"
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      {icon && <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg", tones[tone])}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-lg font-bold leading-tight text-slate-900">{value}</div>
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
      </div>
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}