import { z } from 'zod';
import { decimalString, nome } from './common.js';

const optionalText = z
  .string()
  .trim()
  .max(50)
  .nullish()
  .transform((v) => (v ? v : null));

export const empresaCreate = z.object({ nome, nif: optionalText });
export const empresaUpdate = z.object({ nome, nif: optionalText, ativa: z.boolean() }).partial();

export const carteiraCreate = z.object({
  empresaId: z.string().min(1),
  nome,
  tipo: z.enum(['BANCO', 'WALLET_BINANCE', 'OUTRO']),
  moeda: z.enum(['AOA', 'USDT']),
  saldoInicial: decimalString.default('0'),
});
export const carteiraUpdate = carteiraCreate.omit({ empresaId: true }).extend({ ativa: z.boolean() }).partial();

export const categoriaCreate = z.object({
  empresaId: z.string().min(1),
  nome,
  tipo: z.enum(['ENTRADA', 'SAIDA', 'AMBOS']).default('AMBOS'),
});
export const categoriaUpdate = categoriaCreate.omit({ empresaId: true }).extend({ ativa: z.boolean() }).partial();

export const destinoCreate = z.object({
  empresaId: z.string().min(1),
  nome,
  tipo: z.enum(['PESSOA', 'FORNECEDOR', 'CLIENTE', 'CARTEIRA_EXTERNA', 'OUTRO']).default('OUTRO'),
});
export const destinoUpdate = destinoCreate.omit({ empresaId: true }).extend({ ativo: z.boolean() }).partial();
