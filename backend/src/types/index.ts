export type UserRole = 'seeker' | 'helper' | 'provider' | 'admin';
export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'expired';
export type CylinderType = 'LPG' | 'CNG';
export type BusinessType = 'LPG' | 'CNG' | 'Both';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}
