import type { Moeda } from '@prisma/client';
import { Decimal, type DecimalValue } from '../lib/decimal.js';

// Casas decimais com que cada moeda é guardada quando o valor é calculado.
export const CASAS: Record<Moeda, number> = { AOA: 2, USDT: 8 };
const CASAS_TAXA = 8;

const arred = (d: Decimal, casas: number) => d.toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);

// Converte um valor entre moedas com a taxa (AOA por 1 USDT).
export function converter(valor: DecimalValue, de: Moeda, para: Moeda, taxa: DecimalValue): Decimal {
  const v = new Decimal(valor);
  if (de === para) return v;
  const r = de === 'USDT' ? v.times(taxa) : v.dividedBy(taxa);
  return arred(r, CASAS[para]);
}

// Taxa implícita (AOA por 1 USDT) a partir dos dois valores.
export function taxaImplicita(enviado: DecimalValue, de: Moeda, recebido: DecimalValue): Decimal {
  const [aoa, usdt] = de === 'USDT' ? [recebido, enviado] : [enviado, recebido];
  return arred(new Decimal(aoa).dividedBy(usdt), CASAS_TAXA);
}
