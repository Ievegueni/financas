import { z } from 'zod';
import { decimalString } from './common.js';

const positivo = decimalString.refine((v) => /[1-9]/.test(v), 'O valor tem de ser maior que zero');
const opcional = positivo.nullish().transform((v) => v ?? null);

// Taxa = AOA por 1 USDT. Em câmbio basta enviar a taxa OU o valor recebido; o outro é calculado.
export const transferenciaCreate = z.object({
  origemCarteiraId: z.string().min(1),
  destinoCarteiraId: z.string().min(1),
  valorEnviado: positivo,
  valorRecebido: opcional,
  taxaCambio: opcional,
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (aaaa-mm-dd)')
    .transform((v) => new Date(`${v}T00:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), 'Data inválida'),
  descricao: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type TransferenciaCreate = z.infer<typeof transferenciaCreate>;
