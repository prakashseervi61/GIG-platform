export interface Kpis {
  totalWorkers: number;
  verifiedWorkers: number;
  pendingVerifications: number;
  totalCustomers: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  emergencyBookings: number;
  transactionValue: number;
  avgRating: number;
}

export interface Analytics {
  bookingsByStatus: { status: string; count: number }[];
  bookingsByDay: { day: string; count: number }[];
  revenueByDay: { day: string; amount: number }[];
  bookingsByService: { service: string; category: string; bookings: number; revenue: number }[];
  bookingsByCategory: { category: string; bookings: number; revenue: number }[];
  topWorkers: { id: string; name: string; rating: number; completed: number; total: number; revenue: number }[];
}

export type WorkerStatus = "pending" | "approved" | "rejected";

export interface AdminWorker {
  id: string;
  userId: string;
  name: string;
  cooperativeId?: string | null;
  cooperativeName?: string | null;
  experienceYears?: number | null;
  hourlyRate: number;
  rating: number;
  ratingCount: number;
  verificationStatus: WorkerStatus;
  isAvailable?: boolean;
  certifications?: { id: string; issuer: string; certificateNumber?: string | null; issueDate?: string | null; verificationStatus: string }[];
}

export type BookingStatus = "requested" | "assigned" | "accepted" | "in_progress" | "completed" | "cancelled" | "rejected";

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  workerId?: string | null;
  workerName?: string | null;
  serviceName: string;
  serviceCategory: string;
  scheduledStart: string;
  address: string;
  status: BookingStatus;
  priority: "normal" | "emergency";
  price: number;
  createdAt: string;
}

export interface ForecastRow {
  date: string;
  zone: string;
  category: string;
  expectedRequests: number;
  emergencyExpected: number;
  label: string;
  confidence: number;
  historicalMean: number;
}

export interface WorkforceRow extends ForecastRow {
  availableWorkers: number;
  recommendedWorkers: number;
  gap: number;
  recommendation: string;
}

export interface ForecastResponse {
  model: string;
  generatedAt: string;
  period: { start: string; end: string };
  zones: string[];
  forecast: ForecastRow[];
}

export interface WorkforceResponse {
  model: string;
  capacityPerWorker: number;
  generatedAt: string;
  period: { start: string; end: string };
  zones: string[];
  workforce: WorkforceRow[];
}

export interface ValidationMetric {
  days: number;
  mae: number;
  mape: number;
  bias: number;
}

export interface ValidationRow {
  model: string;
  evaluatedPeriod: { start: string; end: string };
  overall: ValidationMetric;
  perCategory: Record<string, ValidationMetric>;
}