import Decimal from 'decimal.js';
import type { Moeda } from './money';

// Mesmas regras do backend (services/cambio.ts): AOA a 2 casas, USDT a 8, taxa a 8.
const CASAS: Record<Moeda, number> = { AOA: 2, USDT: 8 };
const arred = (d: Decimal, casas: number) => d.toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);

// taxa = AOA por 1 USDT. Devolve string decimal da API.
export function converter(valor: string, de: Moeda, para: Moeda, taxa: string): string {
  const v = new Decimal(valor);
  if (de === para) return v.toFixed();
  const r = de === 'USDT' ? v.times(taxa) : v.dividedBy(taxa);
  return arred(r, CASAS[para]).toFixed();
}

export function taxaImplicita(enviado: string, de: Moeda, recebido: string): string {
  const [aoa, usdt] = de === 'USDT' ? [recebido, enviado] : [enviado, recebido];
  return arred(new Decimal(aoa).dividedBy(usdt), 8).toFixed();
}

export const positivo = (v: string | null): v is string => !!v && /[1-9]/.test(v);
