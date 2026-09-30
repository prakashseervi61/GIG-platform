import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

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

export function BackLink({ to = "/" }: { to?: string }) {
  const navigate = useNavigate();
  // go back through history when there is somewhere to go back to, so the
  // user returns to the list they came from rather than always landing on Home
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate(to);
  };
  return (
    <button type="button" onClick={goBack} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
      <span aria-hidden>←</span> Back
    </button>
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

const bookingTone: Record<string, BadgeTone> = {
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

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
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
  // pages store the message as a plain string (e.message), so accept both
  // shapes - otherwise every real error is replaced by the generic fallback
  const msg =
    typeof error === "string" && error.trim()
      ? error
      : error instanceof Error
        ? error.message
        : "Something went wrong.";
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

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

/**
 * Confirmation for irreversible actions. The first such pattern in the app, so
 * it lives here next to Button/Field and is meant to be reused.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // keep the latest callback in a ref so the effect depends only on `open`;
  // callers pass inline arrows, which would otherwise re-lock body scroll on
  // every render
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  // move focus into the dialog on open, trap Tab inside it, and hand focus back
  // to whatever opened it on close. Without this the dialog is reachable by Tab
  // but focus never actually enters it, and screen-reader users are left on the
  // page behind the overlay.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // wrap at both ends so focus cannot escape the modal
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // prefer focusing the cancel button: it is the non-destructive choice
    const initial = panelRef.current?.querySelector<HTMLElement>("button");
    initial?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      onClick={() => cancelRef.current()}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="anim-scale-in w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-extrabold text-navy">{title}</h2>
        {message && <p className="mt-1.5 text-sm leading-snug text-navy-600">{message}</p>}
        <div className="mt-4 flex gap-2">
          <Button tone="secondary" className="flex-1" onClick={() => cancelRef.current()} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button tone={tone} className="flex-1" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}