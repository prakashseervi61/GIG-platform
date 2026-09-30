import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { Button, Card, ConfirmDialog, EmptyState, ErrorBox, Field, Input, Skeleton } from "../components/ui";
import { Check, Home, Pencil, Plus, Trash2, X } from "lucide-react";

interface Address {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

type Draft = { label: string; address: string };

const EMPTY: Draft = { label: "", address: "" };

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const d = await api.get("/customers/me/addresses");
      setAddresses((d.addresses ?? []) as Address[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startAdd() {
    setEditingId("new");
    setDraft(EMPTY);
    setFormError("");
  }

  function startEdit(a: Address) {
    setEditingId(a.id);
    setDraft({ label: a.label, address: a.address });
    setFormError("");
  }

  function cancel() {
    setEditingId(null);
    setDraft(EMPTY);
    setFormError("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const label = draft.label.trim();
    const address = draft.address.trim();
    if (!label || !address) {
      setFormError("Both a label and an address are required.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (editingId === "new") {
        await api.post("/customers/me/addresses", { label, address });
      } else if (editingId) {
        await api.patch(`/customers/me/addresses/${editingId}`, { label, address });
      }
      cancel();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/customers/me/addresses/${id}/default`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update default");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.del(`/customers/me/addresses/${id}`);
      if (editingId === id) cancel();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete address");
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  }

  const showForm = editingId !== null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">Saved Addresses</h1>
        {!showForm && (
          <Button size="sm" onClick={startAdd}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy">{editingId === "new" ? "New address" : "Edit address"}</h2>
            <button type="button" onClick={cancel} aria-label="Cancel" className="rounded-lg p-1 text-navy-400 active:bg-slate-100">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={save} className="space-y-3">
            <Field label="Label" hint="For example Home, Office, Parents' place">
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="Home"
                maxLength={100}
              />
            </Field>
            <Field label="Full address">
              <Input
                value={draft.address}
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                placeholder="123 Anna Nagar, Coimbatore"
                maxLength={500}
              />
            </Field>
            {formError && <ErrorBox error={formError} />}
            <div className="flex gap-2">
              <Button type="submit" loading={busy} className="flex-1">
                {editingId === "new" ? "Save address" : "Update"}
              </Button>
              <Button type="button" tone="secondary" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBox error={error} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <EmptyState icon="🏠" title="No saved addresses" message="Add your home, office, or any frequent location." />
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <Home size={18} className="mt-0.5 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-navy">{a.label}</span>
                    {a.isDefault && (
                      <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-xs text-navy-600">{a.address}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Button size="sm" tone="secondary" onClick={() => startEdit(a)} disabled={busy}>
                  <Pencil size={13} className="mr-1" /> Edit
                </Button>
                {!a.isDefault && (
                  <Button size="sm" tone="ghost" onClick={() => setDefault(a.id)} disabled={busy}>
                    <Check size={13} className="mr-1" /> Set default
                  </Button>
                )}
                <Button size="sm" tone="ghost" className="ml-auto text-red-600" onClick={() => setConfirmDelete(a.id)} disabled={busy}>
                  <Trash2 size={13} className="mr-1" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this address?"
        message={
          addresses.find((a) => a.id === confirmDelete)?.isDefault
            ? "This is your default address. Deleting it moves the default to another address."
            : "This can't be undone."
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
