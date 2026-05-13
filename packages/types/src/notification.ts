import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const NotificationChannelSchema = z.enum(['push', 'sms', 'email']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  channel: NotificationChannelSchema,
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  readAt: TimestampSchema.optional(),
  sentAt: TimestampSchema,
  createdAt: TimestampSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const DeviceSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  expoPushToken: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Device = z.infer<typeof DeviceSchema>;
