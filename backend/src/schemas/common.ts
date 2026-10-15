import { z } from 'zod';

export const idParam = z.object({ id: z.string().min(1) });
export const empresaQuery = z.object({ empresaId: z.string().min(1, 'empresaId obrigatório') });

const nome = z.string().trim().min(1, 'Nome obrigatório').max(100);
export { nome };

// Decimal(20, 8): até 12 dígitos inteiros e 8 decimais. Valores viajam como string.
export const decimalString = z
  .string()
  .trim()
  .regex(/^\d{1,12}(\.\d{1,8})?$/, 'Valor inválido (use ponto como separador decimal, máx. 8 decimais)');
