import { Zap, Droplets, Broom, Hammer, Paintbrush, Leaf, Car, HeartPulse, CircleDot, MoreHorizontal } from "lucide-react";

export const tintBg: Record<string, string> = {
  Electrical: "bg-teal-50 text-teal-700",
  Plumbing: "bg-sky-50 text-sky-700",
  Cleaning: "bg-green-50 text-green-700",
  Carpentry: "bg-amber-50 text-amber-700",
  Painting: "bg-rose-50 text-rose-700",
  Gardening: "bg-emerald-50 text-emerald-700",
  Drivers: "bg-blue-50 text-blue-700",
  Caregivers: "bg-pink-50 text-pink-700",
  "Appliance Repair": "bg-violet-50 text-violet-700",
  More: "bg-slate-100 text-slate-700"
};

/**
 * The browse rail shown on the home page. `to` is explicit because the final
 * entry is a shortcut to the full catalogue, not a category of its own - the
 * old hardcoded "More" entry pointed at /category/More, which has no services.
 */
export const serviceCategories = [
  { name: "Electrical", Icon: Zap, to: "/category/Electrical" },
  { name: "Plumbing", Icon: Droplets, to: "/category/Plumbing" },
  { name: "Cleaning", Icon: Broom, to: "/category/Cleaning" },
  { name: "Carpentry", Icon: Hammer, to: "/category/Carpentry" },
  { name: "Painting", Icon: Paintbrush, to: "/category/Painting" },
  { name: "Gardening", Icon: Leaf, to: "/category/Gardening" },
  { name: "Drivers", Icon: Car, to: "/category/Drivers" },
  { name: "Caregivers", Icon: HeartPulse, to: "/category/Caregivers" },
  { name: "Appliance Repair", Icon: CircleDot, to: "/category/Appliance%20Repair" },
  { name: "More", Icon: MoreHorizontal, to: "/category" }
];

/** Where a category name should navigate to, falling back to All Services. */
export function categoryPath(name: string) {
  return serviceCategories.find((c) => c.name === name)?.to ?? `/category/${encodeURIComponent(name)}`;
}

export function categoryIcon(name: string) {
  return serviceCategories.find((c) => c.name === name)?.Icon ?? CircleDot;
}

export function categoryTint(name: string) {
  return tintBg[name] ?? "bg-slate-100 text-slate-700";
}

/** Categories that actually have services, in first-seen order. */
export function categoriesOf(services: Array<{ category?: string | null }>): string[] {
  const seen: string[] = [];
  for (const s of services) {
    const c = (s.category ?? "").trim();
    if (c && !seen.includes(c)) seen.push(c);
  }
  return seen.sort((a, b) => a.localeCompare(b));
}
