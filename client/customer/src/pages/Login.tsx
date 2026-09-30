import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Smartphone } from "lucide-react";
import { useAuth } from "../AuthContext";
import { Button, ErrorBox, Field, Input } from "../components/ui";

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [dir, setDir] = useState<"left" | "right">(params.get("mode") === "register" ? "right" : "left");

  function changeMode(m: "login" | "register") {
    if (m !== mode) {
      setDir(m === "register" ? "right" : "left");
      setMode(m);
    }
    setError("");
    setParams(m === "register" ? { mode: "register" } : {}, { replace: true });
  }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  useEffect(() => {
    if (user) nav("/", { replace: true });
  }, [user, nav]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const identifier = form.phone.trim() || form.email.trim();
    if (!identifier || !form.password) return setError("Fill in all fields");
    setBusy(true);
    try {
      const u =
        mode === "login"
          ? await login(identifier, form.password)
          : await register({ name: form.name, phone: form.phone || undefined, email: form.email || undefined, password: form.password });
      nav(u ? "/" : "/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface px-5 py-8">
      <Link to="/" className="mb-10 flex items-center gap-2">
        <span className="text-lg font-extrabold text-navy">CoopGig</span>
      </Link>

      <div key={`head-${mode}`} className={dir === "right" ? "auth-slide-right" : "auth-slide-left"}>
        <h1 className="text-2xl font-extrabold text-navy">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-1 text-sm text-navy-600">
          {mode === "login" ? "Sign in to book trusted local workers." : "Join your local cooperative marketplace."}
        </p>
      </div>

      <div className="relative mt-8 flex rounded-xl bg-white p-1 shadow-sm">
        <span
          aria-hidden
          className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-brand-600 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            mode === "login" ? "translate-x-0" : "translate-x-[calc(100%+0.25rem)]"
          }`}
        />
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            className={`relative z-10 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-200 ${
              mode === m ? "text-white" : "text-navy-600 hover:text-navy"
            }`}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} key={`form-${mode}`} className={`mt-6 space-y-3 ${dir === "right" ? "auth-slide-right" : "auth-slide-left"}`}>
        {mode === "register" && (
          <Field label="Full name">
            <Input value={form.name} onChange={set("name")} placeholder="Prakash Kumar" />
          </Field>
        )}
        <Field label={mode === "register" ? "Mobile number" : "Mobile number or email"}>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} />
            <Input
              value={form.phone}
              onChange={set("phone")}
              placeholder="9876500000"
              className="pl-9"
              inputMode={mode === "login" && !form.phone ? "email" : "tel"}
            />
          </div>
        </Field>
        {mode === "register" && (
          <Field label="Email (optional)">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} />
              <Input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className="pl-9" />
            </div>
          </Field>
        )}
        <Field label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} />
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="At least 8 characters"
              className="pl-9 pr-10"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {mode === "login" && (
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-navy-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              Remember me
            </label>
            <button type="button" className="font-semibold text-brand-700">Forgot password?</button>
          </div>
        )}

        {error && <ErrorBox error={error} />}

        <Button type="submit" loading={busy} className="w-full" size="lg">
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {mode === "login" && (
        <div key={`extras-${mode}`} className={`mt-4 auth-slide-left`}>
          <button type="button" className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-navy transition hover:bg-slate-50">
            Continue with Google
          </button>
          <p className="mt-6 text-center text-xs text-navy-400">
            Demo: <span className="font-medium text-navy-600">9876500001</span> · <span className="font-medium text-navy-600">customer@123</span>
          </p>
        </div>
      )}
    </div>
  );
}
