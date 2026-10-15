import type { Moeda, PrismaClient } from '@prisma/client';
import { Decimal } from '../lib/decimal.js';

export interface SaldoCarteira {
  id: string;
  nome: string;
  moeda: Moeda;
  ativa: boolean;
  saldoInicial: string;
  entradas: string;
  saidas: string;
  saldo: string;
}

export interface Saldos {
  carteiras: SaldoCarteira[];
  porMoeda: { moeda: Moeda; saldo: string }[];
}

// Saldo = saldoInicial + Σ entradas − Σ saídas (movimentos não eliminados). Nunca guardado.
export async function calcularSaldos(db: PrismaClient, empresaId: string): Promise<Saldos> {
  const [carteiras, somas] = await Promise.all([
    db.carteira.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } }),
    db.movimento.groupBy({
      by: ['carteiraId', 'tipo'],
      where: { empresaId, eliminadoEm: null },
      _sum: { valor: true },
    }),
  ]);

  const soma = (carteiraId: string, tipo: 'ENTRADA' | 'SAIDA') =>
    new Decimal(somas.find((s) => s.carteiraId === carteiraId && s.tipo === tipo)?._sum.valor ?? 0);

  const totais = new Map<Moeda, Decimal>();
  const linhas = carteiras.map((c) => {
    const entradas = soma(c.id, 'ENTRADA');
    const saidas = soma(c.id, 'SAIDA');
    const saldo = new Decimal(c.saldoInicial).plus(entradas).minus(saidas);
    totais.set(c.moeda, (totais.get(c.moeda) ?? new Decimal(0)).plus(saldo));
    return {
      id: c.id,
      nome: c.nome,
      moeda: c.moeda,
      ativa: c.ativa,
      saldoInicial: c.saldoInicial.toFixed(),
      entradas: entradas.toFixed(),
      saidas: saidas.toFixed(),
      saldo: saldo.toFixed(),
    };
  });

  const ordem: Moeda[] = ['AOA', 'USDT'];
  return {
    carteiras: linhas,
    porMoeda: ordem.filter((m) => totais.has(m)).map((moeda) => ({ moeda, saldo: totais.get(moeda)!.toFixed() })),
  };
}
