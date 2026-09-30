import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerWorker } from "../lib/api";
import { Button, Card, ErrorBox, Field, Input } from "../components/ui";
import { useAuth } from "../useAuth";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        if (!identifier.trim() || !password) throw new Error("Enter your identifier and password");
        await login(identifier, password);
      } else {
        if (!name.trim() || !identifier.trim() || password.length < 6) throw new Error("Name, phone/email and a 6+ char password are required");
        await registerWorker({ name, phone: /^\d+$/.test(identifier) ? identifier : undefined, email: !/^\d+$/.test(identifier) ? identifier : undefined, password });
      }
      nav("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-2xl">🧰</div>
          <h1 className="text-xl font-extrabold text-slate-900">CoopGig Worker</h1>
          <p className="text-sm text-slate-500">Sign in to receive job requests</p>
        </div>
        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["login", "register"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize ${mode === m ? "bg-white text-brand-700 shadow" : "text-slate-500"}`}>
              {m}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ajay Kumar" /></Field>
          )}
          <Field label="Phone or email"><Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="9876500001" /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
          {error && <ErrorBox error={error} />}
          <Button className="w-full" loading={busy}>{mode === "login" ? "Sign in" : "Create worker account"}</Button>
          <p className="text-center text-xs text-slate-400">Demo worker · 9876500002 · worker@123</p>
        </form>
      </Card>
    </div>
  );
}