export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  basePrice?: number;
  emergencyAvailable?: boolean;
  is_active?: boolean;
  bookingCount?: number;
  skills?: { skillId: string; name: string }[];
}

export interface WorkerResult {
  id: string;
  userId: string;
  workerName: string;
  cooperativeId?: string | null;
  cooperativeName?: string | null;
  experienceYears: number;
  hourlyRate: number;
  rating: number;
  ratingCount: number;
  reliability: number;
  distanceKm: number;
  isAvailable?: boolean;
  skills?: WorkerSkill[];
  completedBookings?: number;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  cooperativeId?: string | null;
  cooperativeName?: string | null;
  experienceYears?: number | null;
  hourlyRate: number;
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus: string;
  isAvailable?: boolean;
  rating: number;
  ratingCount: number;
  reliability: number;
  skillCount?: number;
  languages?: string[];
  noOfJobs?: number;
}

export interface WorkerSkill {
  id?: string;
  skillId?: string;
  name?: string;
  experienceLevel?: string;
  yearsOfExperience?: number | null;
}

export interface WorkerCertification {
  id: string;
  workerId: string;
  title: string;
  issuingAuthority?: string | null;
  issuedAt?: string | null;
  validUntil?: string | null;
  documentUrl?: string | null;
  verificationStatus: string;
}

export type BookingStatus = "requested" | "assigned" | "accepted" | "in_progress" | "completed" | "cancelled" | "rejected";

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  workerId?: string | null;
  workerName?: string | null;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceBasePrice: number;
  cooperativeName?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  status: BookingStatus;
  priority: "normal" | "emergency";
  price: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  provider?: string | null;
  providerOrderId?: string | null;
  transactionId?: string | null;
  status: string;
  createdAt: string;
  paidAt?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  bookingId: string;
  serviceName?: string;
  customerName?: string;
  workerName?: string | null;
  cooperativeName?: string | null;
  subtotal: number;
  surcharge?: number;
  tax?: number;
  total: number;
  status: string;
  issuedAt: string;
}

export interface Rating {
  id: string;
  bookingId: string;
  workerId: string;
  workerName?: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface Notif {
  id: string;
  title: string;
  body?: string | null;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

export interface LocationResult {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  label?: string;
  accuracyM?: number;
}