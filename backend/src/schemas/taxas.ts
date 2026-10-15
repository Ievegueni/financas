import { z } from 'zod';
import { decimalString } from './common.js';

export const taxaCreate = z.object({
  valor: decimalString.refine((v) => /[1-9]/.test(v), 'A taxa tem de ser maior que zero'),
  data: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .transform((v) => (v ? new Date(v.length === 10 ? `${v}T00:00:00.000Z` : v) : undefined)),
});

export const taxaListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
