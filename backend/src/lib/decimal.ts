import { Prisma } from '@prisma/client';

// Sem isto, valores como 0.00000001 USDT saem em JSON como "1e-8".
Prisma.Decimal.set({ toExpNeg: -40, toExpPos: 40 });

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
