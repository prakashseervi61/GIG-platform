import { useAuth } from "../AuthContext";
import { Badge, Button, Card } from "../components/ui";
import { initials } from "../lib/format";
import { Bell, CreditCard, HelpCircle, Home, Lock, MapPin, Menu, Phone, Shield, User, Users, Wallet } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">{title}</h3>
      <Card className="p-1.5 divide-y divide-slate-100">{children}</Card>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <>
      <Card className="mb-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white">
            {initials(user?.name ?? "?")}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-navy">{user?.name ?? "Prakash"}</h1>
            <p className="text-xs text-navy-400 flex items-center gap-1">
              <MapPin size={10} /> Coimbatore, Tamil Nadu
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge tone="green">verified</Badge>
              <Badge>customer</Badge>
            </div>
          </div>
          <Bell size={18} className="text-navy-400" />
        </div>
      </Card>

      <Section title="Account">
        <MenuItem icon={User} label="Personal Information" />
        <MenuItem icon={Users} label="Saved Addresses" badge="2" />
        <MenuItem icon={CreditCard} label="Payment Methods" />
      </Section>

      <Section title="Activity">
        <MenuItem icon={Home} label="My Bookings" />
        <MenuItem icon={Wallet} label="Favorites" />
        <MenuItem icon={Wallet} label="Reviews" />
      </Section>

      <Section title="Preferences">
        <MenuItem icon={Menu} label="Language" />
        <MenuItem icon={Bell} label="Notifications" />
        <MenuItem icon={MapPin} label="Location" />
      </Section>

      <Section title="Support">
        <MenuItem icon={HelpCircle} label="Help Center" />
        <MenuItem icon={Phone} label="Contact Support" />
        <MenuItem icon={Shield} label="Report an Issue" />
      </Section>

      <Section title="Security">
        <MenuItem icon={Lock} label="Change Password" />
        <MenuItem icon={Shield} label="Privacy" />
        <Button tone="danger" className="w-full mt-2" onClick={() => void logout()}>Sign Out</Button>
      </Section>

      <div className="h-20" />
    </>
  );
}

function MenuItem({ icon: Icon, label, badge }: { icon: any; label: string; badge?: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-100 transition">
      <Icon size={18} className="text-brand-700" />
      <span className="flex-1 text-sm font-medium text-navy">{label}</span>
      {badge && <span className="text-xs text-navy-400">{badge}</span>}
    </button>
  );
}
