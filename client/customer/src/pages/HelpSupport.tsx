import { useState } from "react";
import { Search, HelpCircle, CreditCard, Wrench, FileX, AlertTriangle, UserCircle, Phone } from "lucide-react";
import { Button, Card, Input } from "../components/ui";

const categories = [
  { label: "Booking Help", icon: Wrench },
  { label: "Payment Issues", icon: CreditCard },
  { label: "Worker Issues", icon: UserCircle },
  { label: "Cancellation", icon: FileX },
  { label: "Refunds", icon: AlertTriangle },
  { label: "Account", icon: HelpCircle },
  { label: "Emergency Services", icon: Phone },
];

export default function HelpSupport() {
  const [query, setQuery] = useState("");

  const filtered = categories.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <h1 className="mb-1 text-xl font-extrabold text-navy">Help & Support</h1>
      <p className="mb-4 text-sm text-navy-400">How can we help?</p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="How can we help?"
          className="pl-9"
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {filtered.map((c) => (
          <Card key={c.label} className="p-4 hover:shadow-sm transition">
            <c.icon size={20} className="mb-2 text-brand-700" />
            <div className="text-sm font-semibold text-navy">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-2 text-base font-extrabold text-navy">Still stuck?</h2>
        <p className="text-sm text-navy-600">Our support team is available 7am–10pm IST, every day.</p>
        <Button className="w-full mt-3" tone="secondary">
          <Phone size={16} className="mr-2" /> Contact Support
        </Button>
      </Card>
    </>
  );
}
