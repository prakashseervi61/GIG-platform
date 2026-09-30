import type { AuthUser } from "../types";
import { ApiError } from "../utils/ApiError";
import { getOwnWorkerId } from "./worker.service";
import { getWorkerEarningsStats } from "../models/earnings.model";
import { listPayments } from "../models/payment.model";

export async function getWorkerEarnings(user: AuthUser) {
  const workerId = await getOwnWorkerId(user.sub);
  if (!workerId) {
    throw ApiError.notFound("WORKER_PROFILE_NOT_FOUND", "Complete your worker profile first");
  }
  const stats = await getWorkerEarningsStats(workerId);
  const recent = await listPayments({ workerId, status: "completed", limit: 10, offset: 0 });
  return {
    totalEarned: stats.total,
    paidBookings: stats.paidBookings,
    monthly: stats.monthly,
    recentTransactions: recent
  };
}