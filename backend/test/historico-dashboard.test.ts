import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authedApp, prisma, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const ctx = await authedApp();
  const empresa = await prisma.empresa.create({ data: { nome: 'Alfa' } });
  const outra = await prisma.empresa.create({ data: { nome: 'Beta' } });
  const aoa = await prisma.carteira.create({
    data: { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA', saldoInicial: '1000' },
  });
  const usdt = await prisma.carteira.create({
    data: { empresaId: empresa.id, nome: 'Binance', tipo: 'WALLET_BINANCE', moeda: 'USDT', saldoInicial: '10' },
  });
  const venda = await prisma.categoria.create({ data: { empresaId: empresa.id, nome: 'Venda', tipo: 'ENTRADA' } });
  const salarios = await prisma.categoria.create({ data: { empresaId: empresa.id, nome: 'Salários', tipo: 'SAIDA' } });
  const fornecedor = await prisma.categoria.create({ data: { empresaId: empresa.id, nome: 'Fornecedor', tipo: 'SAIDA' } });
  const maria = await prisma.destino.create({ data: { empresaId: empresa.id, nome: 'Maria', tipo: 'PESSOA' } });
  const acme = await prisma.destino.create({ data: { empresaId: empresa.id, nome: 'ACME Lda', tipo: 'FORNECEDOR' } });

  const mov = (data: object) =>
    prisma.movimento.create({
      data: { empresaId: empresa.id, carteiraId: aoa.id, moeda: 'AOA', tipo: 'SAIDA', valor: '1', data: new Date('2026-10-10'), ...data },
    });

  await mov({ tipo: 'ENTRADA', valor: '5000', categoriaId: venda.id, data: new Date('2026-10-01'), descricao: 'Fatura 12' });
  await mov({ valor: '1200', categoriaId: salarios.id, destinoId: maria.id, data: new Date('2026-10-05') });
  await mov({ valor: '800.50', categoriaId: fornecedor.id, destinoId: acme.id, data: new Date('2026-10-20') });
  await mov({ valor: '300', categoriaId: salarios.id, destinoId: maria.id, data: new Date('2026-09-28') });
  await mov({ carteiraId: usdt.id, moeda: 'USDT', tipo: 'ENTRADA', valor: '50.5', data: new Date('2026-10-12') });
  await mov({ carteiraId: usdt.id, moeda: 'USDT', valor: '20', destinoId: acme.id, data: new Date('2026-10-15') });
  // Excluídos: eliminado, outra empresa, transferência.
  await mov({ valor: '99999', eliminadoEm: new Date() });
  const cartOutra = await prisma.carteira.create({ data: { empresaId: outra.id, nome: 'X', tipo: 'BANCO', moeda: 'AOA' } });
  await prisma.movimento.create({
    data: { empresaId: outra.id, carteiraId: cartOutra.id, moeda: 'AOA', tipo: 'ENTRADA', valor: '77', data: new Date('2026-10-10') },
  });
  await mov({ carteiraId: usdt.id, moeda: 'USDT', valor: '5', transferenciaId: 't1', data: new Date('2026-10-11') });
  await mov({ tipo: 'ENTRADA', valor: '4500', transferenciaId: 't1', data: new Date('2026-10-11') });

  return { ...ctx, empresa, aoa, usdt, venda, salarios, maria, acme };
}

const url = (base: string, params: Record<string, string>) => `${base}?${new URLSearchParams(params)}`;

describe('GET /movimentos (filtros)', () => {
  it('aplica cada filtro', async () => {
    const { req, empresa, usdt, salarios, maria } = await setup();
    const total = async (p: Record<string, string>) =>
      (await req('GET', url('/api/movimentos', { empresaId: empresa.id, ...p }))).json().total;

    expect(await total({})).toBe(8); // inclui transferências, exclui eliminado e outra empresa
    expect(await total({ carteiraId: usdt.id })).toBe(3);
    expect(await total({ moeda: 'USDT' })).toBe(3);
    expect(await total({ tipo: 'ENTRADA' })).toBe(3);
    expect(await total({ categoriaId: salarios.id })).toBe(2);
    expect(await total({ destinoId: maria.id })).toBe(2);
    expect(await total({ de: '2026-10-01', ate: '2026-10-15' })).toBe(6);
    expect(await total({ de: '2026-10-20' })).toBe(1);
    expect(await total({ ate: '2026-09-30' })).toBe(1);
    expect(await total({ q: 'fatura' })).toBe(1);
    expect(await total({ q: 'acme' })).toBe(2);
    expect(await total({ q: 'salár', de: '2026-10-01' })).toBe(1);
  });

  it('valida parâmetros', async () => {
    const { req, empresa } = await setup();
    const invalidos: Record<string, string>[] = [{ de: '01/10/2026' }, { moeda: 'EUR' }, { limit: '0' }, { page: 'x' }];
    for (const p of invalidos) {
      expect((await req('GET', url('/api/movimentos', { empresaId: empresa.id, ...p }))).statusCode).toBe(400);
    }
    expect((await req('GET', '/api/movimentos')).statusCode).toBe(400);
  });
});

describe('/taxas', () => {
  it('cria e lista a mais recente primeiro', async () => {
    const { req } = await authedApp();
    expect((await req('POST', '/api/taxas', { valor: '900', data: '2026-10-01' })).statusCode).toBe(201);
    const nova = await req('POST', '/api/taxas', { valor: '925.5' });
    expect(nova.json().valor).toBe('925.5');
    const lista = (await req('GET', '/api/taxas')).json();
    expect(lista.map((t: { valor: string }) => t.valor)).toEqual(['925.5', '900']);
  });

  it('rejeita taxa zero ou inválida', async () => {
    const { req } = await authedApp();
    for (const valor of ['0', '-1', 'abc', 900]) {
      expect((await req('POST', '/api/taxas', { valor })).statusCode).toBe(400);
    }
  });
});

describe('GET /dashboard', () => {
  it('totais por moeda, categoria e destino no período, sem transferências nem eliminados', async () => {
    const { req, empresa } = await setup();
    const res = await req('GET', url('/api/dashboard', { empresaId: empresa.id, de: '2026-10-01', ate: '2026-10-31' }));
    expect(res.statusCode).toBe(200);
    const d = res.json();

    expect(d.periodo).toEqual({ de: '2026-10-01', ate: '2026-10-31' });
    expect(d.porMoeda).toEqual([
      { moeda: 'AOA', entradas: '5000', saidas: '2000.5', liquido: '2999.5' },
      { moeda: 'USDT', entradas: '50.5', saidas: '20', liquido: '30.5' },
    ]);

    const saidasAOA = d.porCategoria.filter((c: { tipo: string; moeda: string }) => c.tipo === 'SAIDA' && c.moeda === 'AOA');
    expect(saidasAOA).toEqual([
      { id: expect.any(String), nome: 'Salários', tipo: 'SAIDA', moeda: 'AOA', total: '1200', count: 1 },
      { id: expect.any(String), nome: 'Fornecedor', tipo: 'SAIDA', moeda: 'AOA', total: '800.5', count: 1 },
    ]);
    expect(d.porCategoria.find((c: { nome: string; moeda: string }) => c.moeda === 'USDT' && c.nome === 'Sem categoria')).toBeTruthy();

    const acmeAOA = d.porDestino.find((x: { nome: string; moeda: string }) => x.nome === 'ACME Lda' && x.moeda === 'AOA');
    expect(acmeAOA.total).toBe('800.5');

    // Saldos incluem tudo (também transferências e fora do período): BAI 1000+5000−1200−800.5−300+4500
    expect(d.saldos.porMoeda).toEqual([
      { moeda: 'AOA', saldo: '8199.5' },
      { moeda: 'USDT', saldo: '35.5' }, // 10 + 50.5 − 20 − 5
    ]);
    expect(d.estimativaAOA).toEqual({ taxa: null, saldo: null, entradas: null, saidas: null });
  });

  it('sem período considera tudo', async () => {
    const { req, empresa } = await setup();
    const d = (await req('GET', url('/api/dashboard', { empresaId: empresa.id }))).json();
    expect(d.porMoeda[0]).toMatchObject({ moeda: 'AOA', saidas: '2300.5' });
  });

  it('estimativa em AOA usa a taxa mais recente', async () => {
    const { req, empresa } = await setup();
    await prisma.taxaCambio.create({ data: { valor: '800', data: new Date('2026-09-01') } });
    await prisma.taxaCambio.create({ data: { valor: '900', data: new Date('2026-10-01') } });
    const d = (await req('GET', url('/api/dashboard', { empresaId: empresa.id, de: '2026-10-01', ate: '2026-10-31' }))).json();
    expect(d.estimativaAOA).toEqual({
      taxa: { valor: '900', data: '2026-10-01T00:00:00.000Z' },
      saldo: '40149.5', // 8199.5 + 35.5 × 900
      entradas: '50450', // 5000 + 50.5 × 900
      saidas: '20000.5', // 2000.5 + 20 × 900
    });
  });
});
