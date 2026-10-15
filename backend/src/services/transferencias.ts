import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '../lib/decimal.js';
import { HttpError } from '../lib/errors.js';
import type { TransferenciaCreate } from '../schemas/transferencias.js';
import { converter, taxaImplicita } from './cambio.js';
import { movimentoInclude } from './movimentos.js';

const invalido = (message: string) => new HttpError(400, message);

// Cria as 2 pernas (SAÍDA na origem, ENTRADA no destino) com o mesmo transferenciaId.
// As carteiras podem ser de empresas diferentes. Moedas diferentes = câmbio (guarda a taxa).
export async function criarTransferencia(db: PrismaClient, input: TransferenciaCreate) {
  if (input.origemCarteiraId === input.destinoCarteiraId) {
    throw invalido('A carteira de origem e a de destino têm de ser diferentes');
  }
  const [origem, destino] = await Promise.all([
    db.carteira.findUnique({ where: { id: input.origemCarteiraId } }),
    db.carteira.findUnique({ where: { id: input.destinoCarteiraId } }),
  ]);
  if (!origem) throw invalido('Carteira de origem inválida');
  if (!destino) throw invalido('Carteira de destino inválida');
  if (!origem.ativa) throw invalido('A carteira de origem está desativada');
  if (!destino.ativa) throw invalido('A carteira de destino está desativada');

  let valorRecebido: Decimal;
  let taxa: Decimal | null = null;
  if (origem.moeda === destino.moeda) {
    // Sem câmbio. Recebido pode ser menor (comissões); por defeito = enviado.
    valorRecebido = new Decimal(input.valorRecebido ?? input.valorEnviado);
  } else if (input.valorRecebido) {
    valorRecebido = new Decimal(input.valorRecebido);
    taxa = input.taxaCambio ? new Decimal(input.taxaCambio) : taxaImplicita(input.valorEnviado, origem.moeda, valorRecebido);
  } else if (input.taxaCambio) {
    taxa = new Decimal(input.taxaCambio);
    valorRecebido = converter(input.valorEnviado, origem.moeda, destino.moeda, taxa);
  } else {
    throw invalido('Câmbio: indique a taxa ou o valor recebido');
  }
  if (valorRecebido.lte(0)) throw invalido('O valor recebido tem de ser maior que zero');

  const transferenciaId = randomUUID();
  const comum = { transferenciaId, data: input.data, descricao: input.descricao, taxaCambio: taxa };

  const [saida, entrada] = await db.$transaction([
    db.movimento.create({
      data: {
        ...comum,
        empresaId: origem.empresaId,
        carteiraId: origem.id,
        tipo: 'SAIDA',
        valor: input.valorEnviado,
        moeda: origem.moeda,
      },
      include: movimentoInclude,
    }),
    db.movimento.create({
      data: {
        ...comum,
        empresaId: destino.empresaId,
        carteiraId: destino.id,
        tipo: 'ENTRADA',
        valor: valorRecebido,
        moeda: destino.moeda,
      },
      include: movimentoInclude,
    }),
  ]);
  return { transferenciaId, saida, entrada };
}
