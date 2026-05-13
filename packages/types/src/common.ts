import { z } from 'zod';

export const IdSchema = z.string().min(1);
export type Id = z.infer<typeof IdSchema>;

export const TimestampSchema = z.union([z.string().datetime(), z.date()]).transform((v) =>
  typeof v === 'string' ? new Date(v) : v,
);
export type Timestamp = z.infer<typeof TimestampSchema>;

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
