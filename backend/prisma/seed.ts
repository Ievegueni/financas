// Cria 2 empresas de exemplo com carteiras e categorias base.
// Idempotente: não faz nada se já houver empresas.
import { PrismaClient, type TipoCategoria } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIAS: { nome: string; tipo: TipoCategoria }[] = [
  { nome: 'Venda', tipo: 'ENTRADA' },
  { nome: 'Serviço', tipo: 'ENTRADA' },
  { nome: 'Salários', tipo: 'SAIDA' },
  { nome: 'Fornecedor', tipo: 'SAIDA' },
  { nome: 'Impostos', tipo: 'SAIDA' },
  { nome: 'Outros', tipo: 'AMBOS' },
];

async function main() {
  if (await prisma.empresa.count()) {
    console.log('Já existem empresas; seed ignorado.');
    return;
  }
  for (const nome of ['Empresa 1', 'Empresa 2']) {
    await prisma.empresa.create({
      data: {
        nome,
        carteiras: {
          create: [
            { nome: 'Banco AOA', tipo: 'BANCO', moeda: 'AOA' },
            { nome: 'Binance USDT', tipo: 'WALLET_BINANCE', moeda: 'USDT' },
          ],
        },
        categorias: { create: CATEGORIAS },
      },
    });
  }
  console.log('Seed concluído: 2 empresas criadas.');
}

await main();
await prisma.$disconnect();
