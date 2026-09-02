import { BarberService } from './barber';
import { ClientResponse } from './client';

/** Stored and API booking lifecycle */
export type BookingStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'no_show';

export type CancellationParty = 'client' | 'barber';

export interface Booking {
  id: string;
  barberId: string;
  clientId: string;
  client?: ClientResponse;
  services?: BarberService[];
  timestamp: string;
  status?: BookingStatus;
  declineReason?: string | null;
  cancellationReason?: string | null;
  previousTimestamp?: string | null;
  cancelledBy?: CancellationParty | null;
  completedAt?: string | null;
  /** Sum of service prices at completion time (minor units, e.g. UZS) */
  serviceTotal?: number | null;
  clientArrivalResponse?: 'yes' | 'no' | null;
  clientArrivalConfirmedAt?: string | null;
  barberArrivalResponse?: 'yes' | 'no' | null;
  barberArrivalConfirmedAt?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Row in `bookingServices` linking a booking to a barber service */
export interface BookingServiceLink {
  id: string;
  bookingId: string;
  serviceId: string;
  service?: BarberService;
}

export interface BookingCreateRequest {
  barberId: string;
  clientId: string;
  serviceIds: string[];
  timestamp: string;
}

export interface BookingDetails {
  bookingId: string;
  clientFirstName: string;
  clientLastName: string;
  timestamp: string;
  services: Array<{
    name: string;
    price: number;
    durationMinutes?: number;
  }>;
}

export interface BookingResponse {
  id: string;
  barberId: string;
  clientId: string;
  client?: ClientResponse;
  services?: BarberService[];
  timestamp: string;
  status?: BookingStatus;
  declineReason?: string | null;
  cancellationReason?: string | null;
  previousTimestamp?: string | null;
  cancelledBy?: CancellationParty | null;
  completedAt?: string | null;
  clientArrivalResponse?: 'yes' | 'no' | null;
  clientArrivalConfirmedAt?: string | null;
  barberArrivalResponse?: 'yes' | 'no' | null;
  barberArrivalConfirmedAt?: string | null;
  updatedAt?: Date;
}

/** Mobile contract shape (snake_case JSON) */
export interface BookingContract {
  id: string;
  status: BookingStatus;
  timestamp: string;
  previous_timestamp: string | null;
  cancellation_reason: string | null;
  barber_id: string;
  client_id: string;
  services: Array<{ id: string; name: string; price: number }>;
  updated_at: string;
  client_arrival_response: 'yes' | 'no' | null;
  client_arrival_confirmed_at: string | null;
  barber_arrival_response: 'yes' | 'no' | null;
  barber_arrival_confirmed_at: string | null;
}
