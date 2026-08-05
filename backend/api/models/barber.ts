export interface LatLng {
  latitude: string;
  longitude: string;
}

export type BarberApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface BarberService {
  id: string;
  barberId: string;
  name: string;
  price: number;
  catalogServiceId?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface Barber {
  id: string;
  username: string;
  password?: string; // Only used during creation/update, not returned in responses
  firstName: string;
  lastName: string;
  phone: string;
  location: LatLng;
  birthDate: string;
  workingHours: string;
  experienceYears?: number;
  title?: string;
  bio?: string;
  avatar?: string;
  images: string[];
  deviceId?: string;
  services?: BarberService[];
  approvalStatus?: BarberApprovalStatus;
  approvalMessage?: string;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BarberCreateRequest {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  location: LatLng;
  birthDate: string;
  workingHours: string;
}

export interface BarberLoginRequest {
  username: string;
  password: string;
}

export interface BarberUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: LatLng;
  birthDate?: string;
  workingHours?: string;
  experienceYears?: number;
  title?: string;
  bio?: string;
}

export interface BarberCredentialsUpdateRequest {
  username: string;
  password: string;
}

export interface BarberDeviceUpdateRequest {
  deviceId: string;
}

export interface BarberResponse {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  location: LatLng;
  birthDate: string;
  workingHours: string;
  experienceYears?: number;
  title?: string;
  bio?: string;
  avatar?: string;
  images: string[];
  services?: BarberService[];
  approvalStatus?: BarberApprovalStatus;
  approvalMessage?: string;
  ratingAverage?: number;
  ratingCount?: number;
}

export interface BarberListResponse {
  barbers: BarberResponse[];
  page: number;
  limit: number;
  total: number;
}
