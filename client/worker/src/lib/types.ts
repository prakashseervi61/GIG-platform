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
  issuer?: string;
  certificateNumber?: string | null;
  issueDate?: string | null;
  validity?: string | null;
  documentUrl?: string | null;
  verificationStatus: string;
}

export interface SkillCatalog {
  id: string;
  name: string;
  category?: string | null;
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

export interface Earnings {
  totalEarned: number;
  paidBookings: number;
  monthly: { month: string; amount: number; count: number }[];
  recentTransactions: {
    id: string;
    paymentNumber?: string | null;
    bookingId?: string;
    amount: number;
    paidAt?: string | null;
    status?: string;
    method?: string | null;
  }[];
}

export interface Notif {
  id: string;
  title: string;
  body?: string | null;
  type?: string;
  isRead: boolean;
  createdAt: string;
}