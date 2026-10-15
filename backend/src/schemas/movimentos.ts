import { z } from 'zod';
import { decimalString } from './common.js';

const positivo = decimalString.refine((v) => /[1-9]/.test(v), 'O valor tem de ser maior que zero');

// Data do movimento: "aaaa-mm-dd" (guardada como meia-noite UTC).
const dataDia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (aaaa-mm-dd)')
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), 'Data inválida');

const idOpcional = z
  .string()
  .min(1)
  .nullish()
  .transform((v) => v ?? null);

const descricao = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v ? v : null));

// `moeda` não faz parte do schema: é sempre derivada da carteira (o que vier do cliente é ignorado).
export const movimentoCreate = z.object({
  empresaId: z.string().min(1),
  carteiraId: z.string().min(1),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  valor: positivo,
  taxaCambio: positivo.nullish().transform((v) => v ?? null),
  categoriaId: idOpcional,
  destinoId: idOpcional,
  data: dataDia,
  descricao,
});

export const movimentoUpdate = movimentoCreate.omit({ empresaId: true }).partial();

export const movimentoListQuery = z.object({
  empresaId: z.string().min(1, 'empresaId obrigatório'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MovimentoCreate = z.infer<typeof movimentoCreate>;
export type MovimentoUpdate = z.infer<typeof movimentoUpdate>;
