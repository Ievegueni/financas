import type { Moeda, PrismaClient, TipoMovimento } from '@prisma/client';
import { Decimal } from '../lib/decimal.js';
import type { Periodo } from '../schemas/movimentos.js';
import { periodoWhere } from './movimentos.js';
import { calcularSaldos, type Saldos } from './saldos.js';

const MOEDAS: Moeda[] = ['AOA', 'USDT'];

interface Agrupado {
  id: string | null;
  nome: string;
  tipo: TipoMovimento;
  moeda: Moeda;
  total: string;
  count: number;
}

export interface Dashboard {
  periodo: { de: string | null; ate: string | null };
  saldos: Saldos;
  porMoeda: { moeda: Moeda; entradas: string; saidas: string; liquido: string }[];
  porCategoria: Agrupado[];
  porDestino: Agrupado[];
  estimativaAOA: {
    taxa: { valor: string; data: string } | null;
    saldo: string | null;
    entradas: string | null;
    saidas: string | null;
  };
}

// Totais do período. Exclui movimentos eliminados e pernas de transferência
// (transferências/câmbios não são receita nem despesa).
export async function calcularDashboard(db: PrismaClient, { empresaId, de, ate }: Periodo): Promise<Dashboard> {
  const where = { empresaId, eliminadoEm: null, transferenciaId: null, ...periodoWhere({ de, ate }) };

  const [saldos, porTipo, porCat, porDest, taxa] = await Promise.all([
    calcularSaldos(db, empresaId),
    db.movimento.groupBy({ by: ['moeda', 'tipo'], where, _sum: { valor: true } }),
    db.movimento.groupBy({ by: ['categoriaId', 'tipo', 'moeda'], where, _sum: { valor: true }, _count: true }),
    db.movimento.groupBy({ by: ['destinoId', 'tipo', 'moeda'], where, _sum: { valor: true }, _count: true }),
    db.taxaCambio.findFirst({ orderBy: [{ data: 'desc' }, { id: 'desc' }] }),
  ]);

  const soma = (moeda: Moeda, tipo: TipoMovimento) =>
    new Decimal(porTipo.find((r) => r.moeda === moeda && r.tipo === tipo)?._sum.valor ?? 0);

  const porMoeda = MOEDAS.map((moeda) => {
    const entradas = soma(moeda, 'ENTRADA');
    const saidas = soma(moeda, 'SAIDA');
    return { moeda, entradas, saidas, liquido: entradas.minus(saidas) };
  });

  const [categorias, destinos] = await Promise.all([
    db.categoria.findMany({ where: { empresaId }, select: { id: true, nome: true } }),
    db.destino.findMany({ where: { empresaId }, select: { id: true, nome: true } }),
  ]);
  const nomes = new Map([...categorias, ...destinos].map((x) => [x.id, x.nome]));

  type Linha = { id: string | null; tipo: TipoMovimento; moeda: Moeda; _sum: { valor: Decimal | null }; _count: number };
  const agrupar = (rows: Linha[], semNome: string): Agrupado[] =>
    rows
      .map((r) => ({
        id: r.id,
        nome: r.id ? (nomes.get(r.id) ?? '?') : semNome,
        tipo: r.tipo,
        moeda: r.moeda,
        total: new Decimal(r._sum.valor ?? 0),
        count: r._count,
      }))
      .sort((a, b) => b.total.comparedTo(a.total))
      .map((r) => ({ ...r, total: r.total.toFixed() }));

  // Estimativa em AOA com a taxa mais recente (valores reais estão nos totais por moeda).
  const aoa = (porMoedaValor: (m: Moeda) => Decimal) =>
    taxa ? porMoedaValor('AOA').plus(porMoedaValor('USDT').times(taxa.valor)).toFixed() : null;
  const saldoMoeda = (m: Moeda) => new Decimal(saldos.porMoeda.find((x) => x.moeda === m)?.saldo ?? 0);

  return {
    periodo: { de: de ?? null, ate: ate ?? null },
    saldos,
    porMoeda: porMoeda.map((r) => ({
      moeda: r.moeda,
      entradas: r.entradas.toFixed(),
      saidas: r.saidas.toFixed(),
      liquido: r.liquido.toFixed(),
    })),
    porCategoria: agrupar(porCat.map((r) => ({ ...r, id: r.categoriaId })), 'Sem categoria'),
    porDestino: agrupar(porDest.map((r) => ({ ...r, id: r.destinoId })), 'Sem destino'),
    estimativaAOA: {
      taxa: taxa ? { valor: taxa.valor.toFixed(), data: taxa.data.toISOString() } : null,
      saldo: aoa(saldoMoeda),
      entradas: aoa((m) => soma(m, 'ENTRADA')),
      saidas: aoa((m) => soma(m, 'SAIDA')),
    },
  };
}
