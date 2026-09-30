import type { AuthUser } from "../types";
import { getCooperativesManagedByAdmin } from "../models/worker.model";
import { getBookingAnalytics, getDashboardKpis, type AnalyticsScope } from "../models/analytics.model";

async function resolveScope(user: AuthUser): Promise<AnalyticsScope> {
  if (user.role === "coop_admin") {
    const coops = await getCooperativesManagedByAdmin(user.sub);
    return { coopIds: coops.map((c) => c.id) };
  }
  return { coopIds: null };
}

export async function getDashboard(user: AuthUser) {
  const scope = await resolveScope(user);
  return getDashboardKpis(scope);
}

export async function getAnalytics(user: AuthUser) {
  const scope = await resolveScope(user);
  return getBookingAnalytics(scope);
}