import type { Movimento, Prisma, PrismaClient, TipoMovimento } from '@prisma/client';
import { conflict, HttpError, notFound } from '../lib/errors.js';
import type { MovimentoCreate, MovimentoFiltros, MovimentoUpdate } from '../schemas/movimentos.js';

const invalido = (message: string) => new HttpError(400, message);

export const movimentoInclude = {
  carteira: { select: { id: true, nome: true } },
  categoria: { select: { id: true, nome: true } },
  destino: { select: { id: true, nome: true } },
} as const;

interface Alvo {
  empresaId: string;
  tipo: TipoMovimento;
  carteiraId: string;
  categoriaId: string | null;
  destinoId: string | null;
}

// Valida as referências do movimento e devolve a moeda da carteira.
// Cadastros inativos só são recusados quando estão a ser escolhidos agora (não ao editar outro campo).
async function validarReferencias(db: PrismaClient, alvo: Alvo, atual?: Movimento) {
  const carteira = await db.carteira.findUnique({ where: { id: alvo.carteiraId } });
  if (!carteira || carteira.empresaId !== alvo.empresaId) throw invalido('Carteira inválida para esta empresa');
  if (!carteira.ativa && carteira.id !== atual?.carteiraId) throw invalido('A carteira está desativada');

  if (alvo.categoriaId) {
    const categoria = await db.categoria.findUnique({ where: { id: alvo.categoriaId } });
    if (!categoria || categoria.empresaId !== alvo.empresaId) throw invalido('Categoria inválida para esta empresa');
    if (!categoria.ativa && categoria.id !== atual?.categoriaId) throw invalido('A categoria está desativada');
    if (categoria.tipo !== 'AMBOS' && categoria.tipo !== alvo.tipo) {
      throw invalido(`A categoria "${categoria.nome}" não é usada em ${alvo.tipo === 'ENTRADA' ? 'entradas' : 'saídas'}`);
    }
  }

  if (alvo.destinoId) {
    const destino = await db.destino.findUnique({ where: { id: alvo.destinoId } });
    if (!destino || destino.empresaId !== alvo.empresaId) throw invalido('Destino inválido para esta empresa');
    if (!destino.ativo && destino.id !== atual?.destinoId) throw invalido('O destino está desativado');
  }

  return carteira.moeda;
}

export async function criarMovimento(db: PrismaClient, input: MovimentoCreate) {
  const empresa = await db.empresa.findUnique({ where: { id: input.empresaId } });
  if (!empresa) throw invalido('Empresa inválida');
  const moeda = await validarReferencias(db, input);
  return db.movimento.create({ data: { ...input, moeda }, include: movimentoInclude });
}

async function obterAtivo(db: PrismaClient, id: string) {
  const mov = await db.movimento.findUnique({ where: { id } });
  if (!mov || mov.eliminadoEm) throw notFound('Movimento');
  return mov;
}

export async function atualizarMovimento(db: PrismaClient, id: string, input: MovimentoUpdate) {
  const atual = await obterAtivo(db, id);
  if (atual.transferenciaId) throw conflict('Este movimento faz parte de uma transferência; elimine-a e registe de novo.');

  const alvo: Alvo = {
    empresaId: atual.empresaId,
    tipo: input.tipo ?? atual.tipo,
    carteiraId: input.carteiraId ?? atual.carteiraId,
    categoriaId: input.categoriaId !== undefined ? input.categoriaId : atual.categoriaId,
    destinoId: input.destinoId !== undefined ? input.destinoId : atual.destinoId,
  };
  const moeda = await validarReferencias(db, alvo, atual);
  return db.movimento.update({ where: { id }, data: { ...input, moeda }, include: movimentoInclude });
}

// Soft delete. Numa transferência, elimina as duas pernas na mesma transação.
export async function eliminarMovimento(db: PrismaClient, id: string) {
  const atual = await obterAtivo(db, id);
  const where = atual.transferenciaId ? { transferenciaId: atual.transferenciaId, eliminadoEm: null } : { id };
  await db.movimento.updateMany({ where, data: { eliminadoEm: new Date() } });
}

const dia = (v: string) => new Date(`${v}T00:00:00.000Z`);

export function periodoWhere({ de, ate }: { de?: string; ate?: string }): Prisma.MovimentoWhereInput {
  if (!de && !ate) return {};
  return { data: { ...(de && { gte: dia(de) }), ...(ate && { lte: dia(ate) }) } };
}

export function filtrosWhere(f: MovimentoFiltros): Prisma.MovimentoWhereInput {
  const q = f.q?.trim();
  return {
    empresaId: f.empresaId,
    eliminadoEm: null,
    ...periodoWhere(f),
    ...(f.carteiraId && { carteiraId: f.carteiraId }),
    ...(f.moeda && { moeda: f.moeda }),
    ...(f.tipo && { tipo: f.tipo }),
    ...(f.categoriaId && { categoriaId: f.categoriaId }),
    ...(f.destinoId && { destinoId: f.destinoId }),
    ...(q && {
      OR: [
        { descricao: { contains: q, mode: 'insensitive' } },
        { categoria: { nome: { contains: q, mode: 'insensitive' } } },
        { destino: { nome: { contains: q, mode: 'insensitive' } } },
        { carteira: { nome: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };
}

export async function listarMovimentos(db: PrismaClient, { page, limit, ...filtros }: MovimentoFiltros & { page: number; limit: number }) {
  const where = filtrosWhere(filtros);
  const [items, total] = await Promise.all([
    db.movimento.findMany({
      where,
      orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: movimentoInclude,
    }),
    db.movimento.count({ where }),
  ]);
  return { items, total, page, limit };
}
