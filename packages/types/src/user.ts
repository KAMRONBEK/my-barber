import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const UserRoleSchema = z.enum(['client', 'barber', 'admin', 'superadmin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: IdSchema,
  phone: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: UserRoleSchema.default('client'),
  avatarUrl: z.string().url().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type User = z.infer<typeof UserSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: TimestampSchema,
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
