import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const WorkingHoursSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  openMinutes: z.number().int().min(0).max(1440),
  closeMinutes: z.number().int().min(0).max(1440),
});
export type WorkingHours = z.infer<typeof WorkingHoursSchema>;

export const BarbershopSchema = z.object({
  id: IdSchema,
  name: z.string(),
  ownerId: IdSchema,
  address: z.string(),
  geo: GeoPointSchema.optional(),
  phone: z.string().optional(),
  workingHours: z.array(WorkingHoursSchema).default([]),
  photoUrls: z.array(z.string().url()).default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Barbershop = z.infer<typeof BarbershopSchema>;
