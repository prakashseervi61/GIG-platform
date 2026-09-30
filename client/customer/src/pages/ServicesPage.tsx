import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { api } from "../lib/api";
import type { Service } from "../lib/types";
import { Card, EmptyState, ErrorBox, Skeleton } from "../components/ui";
import { categoriesOf, categoryIcon, categoryTint } from "../lib/categories";
import { inr } from "../lib/format";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("All");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get("/services")
      .then((d) => {
        if (alive) setServices((d.services as Service[]) ?? []);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load services");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => categoriesOf(services), [services]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (active !== "All" && s.category !== active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [services, query, active]);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-navy">All Services</h1>
        <p className="mt-0.5 text-xs text-navy-400">
          {loading ? "Loading…" : `${services.length} service${services.length === 1 ? "" : "s"} · ${categories.length} categories`}
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Search size={18} className="shrink-0 text-navy-400" />
        <input
          className="flex-1 bg-transparent text-sm text-navy placeholder:text-navy-400 outline-none"
          placeholder="Search services"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {categories.length > 1 && (
        <div className="rail mb-4">
          {["All", ...categories].map((c) => {
            const isActive = c === active;
            const Icon = c === "All" ? null : categoryIcon(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-white text-navy-600"
                }`}
              >
                {Icon && <Icon size={13} />}
                {c}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[124px] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No services found"
          message={query ? `Nothing matches "${query}".` : "No services in this category yet."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((s) => {
            const Icon = categoryIcon(s.category ?? "");
            return (
              <Link key={s.id} to={`/services/${s.id}/workers`} className="block">
                <Card className="flex h-full flex-col p-3.5 active:bg-slate-50">
                  <span className={`mb-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryTint(s.category ?? "")}`}>
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <span className="line-clamp-2 block text-sm font-bold leading-snug text-navy">{s.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-navy-400">{s.category}</span>
                  <span className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <span className="text-[11px] text-navy-400">
                      <span className="text-sm font-extrabold text-navy">{inr(Number(s.basePrice ?? 0))}</span>{" "}
                      onwards
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-navy-400" aria-hidden />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
