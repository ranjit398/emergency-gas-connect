// frontend/src/types/index.ts
// FIXED: All field names match what the backend actually returns (camelCase)

export type UserRole = 'seeker' | 'helper' | 'provider' | 'admin';
export type RequestStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rejected';
export type CylinderType = 'LPG' | 'CNG';
export type BusinessType = 'LPG' | 'CNG' | 'Both';

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl: string | null;
  address: string;
  bio: string | null;
  isAvailable: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  ratings: number;
  totalRatings: number;
  completedRequests: number;
  avgResponseTimeMin?: number;
  location?: { type: 'Point'; coordinates: [number, number] } | null;
  createdAt: string;
  updatedAt: string;
}

// ── Seeker/Helper embedded in request ─────────────────────────────────────────
// This matches what the backend aggregation pipeline returns
export interface RequestUser {
  id: string;
  email: string;
  fullName: string;       // from Profile join
  phone?: string;
  avatarUrl?: string | null;
  role?: string;
}

// ── Emergency Request ─────────────────────────────────────────────────────────
export interface EmergencyRequest {
  id: string;
  _id?: string;
  seekerId: string;
  helperId: string | null;
  providerId?: string | null;
  cylinderType: CylinderType;
  quantity: number;
  status: RequestStatus;
  message: string | null;
  location: { type: 'Point'; coordinates: [number, number] };
  address: string;
  estimatedDistance?: number | null;
  rating: number | null;
  review?: string | null;
  assignedAt: string | null;
  completedAt?: string | null;
  priorityScore: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  // ── Populated fields from backend aggregation ──────────────────────────────
  seeker?: RequestUser | null;
  helper?: RequestUser | null;
  // Distance added by geo query
  distanceKm?: number | null;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export interface Provider {
  id: string;
  _id?: string;
  userId: string;
  businessName: string;           // camelCase — was business_name
  businessType: BusinessType;     // camelCase — was business_type
  location: { type: 'Point'; coordinates: [number, number] };
  address: string;
  contactNumber: string;          // camelCase — was contact_number
  registrationNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  isVerified: boolean;            // camelCase — was is_verified
  verificationDocument?: string | null;
  operatingHours?: { open: string; close: string };
  availableCylinders?: { type: CylinderType; quantity: number }[];
  rating: number;
  totalRatings: number;
  completedRequests: number;
  createdAt: string;
  updatedAt?: string;
}

// ── Message ───────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  _id?: string;
  requestId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender?: RequestUser;
  receiver?: RequestUser;
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// ── API response wrappers ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}