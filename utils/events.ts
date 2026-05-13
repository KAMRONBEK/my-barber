import { EventEmitter } from 'events';
import { logger } from './logger';

export interface BookingCreatedEvent {
  bookingId: string;
  barberId: string;
  clientId: string;
  serviceIds: string[];
  timestamp: string;
}

export interface AppEvents {
  'booking:created': BookingCreatedEvent;
  'notification:sent': {
    bookingId: string;
    barberId: string;
    success: boolean;
  };
}

class AppEventEmitter extends EventEmitter {
  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): boolean {
    logger.debug(`Event emitted: ${event}`, data);
    return super.emit(event, data);
  }

  on<K extends keyof AppEvents>(
    event: K,
    listener: (data: AppEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  once<K extends keyof AppEvents>(
    event: K,
    listener: (data: AppEvents[K]) => void
  ): this {
    return super.once(event, listener);
  }
}

export const appEvents = new AppEventEmitter();
