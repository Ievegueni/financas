import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { converter, taxaImplicita } from '../src/services/cambio.js';
import { authedApp, prisma, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const ctx = await authedApp();
  const alfa = await prisma.empresa.create({ data: { nome: 'Alfa' } });
  const beta = await prisma.empresa.create({ data: { nome: 'Beta' } });
  const cart = (empresaId: string, nome: string, moeda: 'AOA' | 'USDT', saldoInicial = '0') =>
    prisma.carteira.create({ data: { empresaId, nome, tipo: 'BANCO', moeda, saldoInicial } });
  const baiA = await cart(alfa.id, 'BAI', 'AOA', '100000');
  const bfaA = await cart(alfa.id, 'BFA', 'AOA');
  const binA = await cart(alfa.id, 'Binance', 'USDT', '500');
  const baiB = await cart(beta.id, 'BAI', 'AOA');
  const base = { data: '2026-10-15' };
  const saldos = async (empresaId: string) => {
    const r = (await ctx.req('GET', `/api/saldos?empresaId=${empresaId}`)).json();
    return Object.fromEntries(r.carteiras.map((c: { nome: string; saldo: string }) => [c.nome, c.saldo]));
  };
  const dashboard = async (empresaId: string) => (await ctx.req('GET', `/api/dashboard?empresaId=${empresaId}`)).json();
  return { ...ctx, alfa, beta, baiA, bfaA, binA, baiB, base, saldos, dashboard };
}

describe('cálculo de câmbio', () => {
  it('converte nos dois sentidos com arredondamento por moeda', () => {
    expect(converter('100.12345678', 'USDT', 'AOA', '925.5').toFixed()).toBe('92664.26'); // 92664.25924989
    expect(converter('100000', 'AOA', 'USDT', '925.5').toFixed()).toBe('108.04970286'); // 108.049702863...
    expect(converter('10', 'AOA', 'AOA', '925.5').toFixed()).toBe('10');
  });
  it('taxa implícita = AOA / USDT', () => {
    expect(taxaImplicita('100', 'USDT', '92550').toFixed()).toBe('925.5');
    expect(taxaImplicita('100000', 'AOA', '108').toFixed()).toBe('925.92592593');
  });
});

describe('POST /transferencias', () => {
  it('transferência na mesma moeda: 2 pernas ligadas, saldos atualizados, dashboard sem receita/despesa', async () => {
    const { req, alfa, baiA, bfaA, base, saldos, dashboard } = await setup();
    const res = await req('POST', '/api/transferencias', {
      ...base,
      origemCarteiraId: baiA.id,
      destinoCarteiraId: bfaA.id,
      valorEnviado: '25000',
      descricao: 'Reforço BFA',
    });
    expect(res.statusCode).toBe(201);
    const { transferenciaId, saida, entrada } = res.json();
    expect(saida).toMatchObject({ tipo: 'SAIDA', valor: '25000', moeda: 'AOA', transferenciaId, taxaCambio: null, descricao: 'Reforço BFA' });
    expect(entrada).toMatchObject({ tipo: 'ENTRADA', valor: '25000', moeda: 'AOA', transferenciaId, carteiraId: bfaA.id });

    expect(await saldos(alfa.id)).toMatchObject({ BAI: '75000', BFA: '25000' });
    const d = await dashboard(alfa.id);
    expect(d.porMoeda[0]).toMatchObject({ moeda: 'AOA', entradas: '0', saidas: '0' });
  });

  it('mesma moeda com comissão: recebido menor que enviado', async () => {
    const { req, baiA, bfaA, base } = await setup();
    const res = await req('POST', '/api/transferencias', {
      ...base, origemCarteiraId: baiA.id, destinoCarteiraId: bfaA.id, valorEnviado: '1000', valorRecebido: '990',
    });
    expect(res.json().entrada.valor).toBe('990');
  });

  it('câmbio USDT→AOA só com a taxa: calcula o recebido e guarda a taxa nas 2 pernas', async () => {
    const { req, alfa, binA, baiA, base, saldos, dashboard } = await setup();
    const res = await req('POST', '/api/transferencias', {
      ...base, origemCarteiraId: binA.id, destinoCarteiraId: baiA.id, valorEnviado: '100', taxaCambio: '925.5',
    });
    expect(res.statusCode).toBe(201);
    const { saida, entrada } = res.json();
    expect(saida).toMatchObject({ valor: '100', moeda: 'USDT', taxaCambio: '925.5' });
    expect(entrada).toMatchObject({ valor: '92550', moeda: 'AOA', taxaCambio: '925.5' });

    // Aceitação: atualiza os dois saldos e não conta como receita nem despesa.
    expect(await saldos(alfa.id)).toMatchObject({ Binance: '400', BAI: '192550' });
    const d = await dashboard(alfa.id);
    expect(d.porMoeda).toEqual([
      { moeda: 'AOA', entradas: '0', saidas: '0', liquido: '0' },
      { moeda: 'USDT', entradas: '0', saidas: '0', liquido: '0' },
    ]);
    expect(d.porCategoria).toEqual([]);
  });

  it('câmbio AOA→USDT só com o recebido: calcula a taxa implícita', async () => {
    const { req, baiA, binA, base } = await setup();
    const res = await req('POST', '/api/transferencias', {
      ...base, origemCarteiraId: baiA.id, destinoCarteiraId: binA.id, valorEnviado: '92550', valorRecebido: '100',
    });
    expect(res.json().entrada).toMatchObject({ valor: '100', moeda: 'USDT', taxaCambio: '925.5' });
  });

  it('câmbio sem taxa nem recebido dá 400', async () => {
    const { req, baiA, binA, base } = await setup();
    const res = await req('POST', '/api/transferencias', { ...base, origemCarteiraId: baiA.id, destinoCarteiraId: binA.id, valorEnviado: '1000' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/taxa/);
  });

  it('câmbio cujo recebido arredonda a zero dá 400', async () => {
    const { req, baiA, binA, base } = await setup();
    const res = await req('POST', '/api/transferencias', {
      ...base, origemCarteiraId: binA.id, destinoCarteiraId: baiA.id, valorEnviado: '0.00000001', taxaCambio: '1',
    });
    expect(res.statusCode).toBe(400);
  });

  it('entre empresas: cada perna fica na sua empresa; nenhuma conta como receita/despesa', async () => {
    const { req, alfa, beta, baiA, baiB, base, saldos, dashboard } = await setup();
    const res = await req('POST', '/api/transferencias', { ...base, origemCarteiraId: baiA.id, destinoCarteiraId: baiB.id, valorEnviado: '30000' });
    const { saida, entrada } = res.json();
    expect(saida.empresaId).toBe(alfa.id);
    expect(entrada.empresaId).toBe(beta.id);
    expect((await saldos(alfa.id)).BAI).toBe('70000');
    expect((await saldos(beta.id)).BAI).toBe('30000');
    expect((await dashboard(alfa.id)).porMoeda[0].saidas).toBe('0');
    expect((await dashboard(beta.id)).porMoeda[0].entradas).toBe('0');
  });

  it('validações de carteiras', async () => {
    const { req, baiA, bfaA, base } = await setup();
    const t = (b: object) => req('POST', '/api/transferencias', { ...base, valorEnviado: '10', ...b });
    expect((await t({ origemCarteiraId: baiA.id, destinoCarteiraId: baiA.id })).statusCode).toBe(400);
    expect((await t({ origemCarteiraId: 'x', destinoCarteiraId: bfaA.id })).statusCode).toBe(400);
    expect((await t({ origemCarteiraId: baiA.id, destinoCarteiraId: bfaA.id, valorEnviado: '0' })).statusCode).toBe(400);
    await prisma.carteira.update({ where: { id: bfaA.id }, data: { ativa: false } });
    expect((await t({ origemCarteiraId: baiA.id, destinoCarteiraId: bfaA.id })).statusCode).toBe(400);
    expect(await prisma.movimento.count()).toBe(0);
  });

  it('eliminar uma perna elimina a outra e repõe os saldos (também entre empresas)', async () => {
    const { req, alfa, beta, baiA, baiB, base, saldos } = await setup();
    const { entrada, transferenciaId } = (
      await req('POST', '/api/transferencias', { ...base, origemCarteiraId: baiA.id, destinoCarteiraId: baiB.id, valorEnviado: '30000' })
    ).json();
    expect((await req('DELETE', `/api/movimentos/${entrada.id}`)).statusCode).toBe(204);
    expect(await prisma.movimento.count({ where: { transferenciaId, eliminadoEm: null } })).toBe(0);
    expect(await prisma.movimento.count({ where: { transferenciaId } })).toBe(2); // soft delete
    expect((await saldos(alfa.id)).BAI).toBe('100000');
    expect((await saldos(beta.id)).BAI).toBe('0');
  });

  it('pernas aparecem no histórico, mas não podem ser editadas individualmente', async () => {
    const { req, alfa, baiA, binA, base } = await setup();
    const { saida } = (
      await req('POST', '/api/transferencias', { ...base, origemCarteiraId: binA.id, destinoCarteiraId: baiA.id, valorEnviado: '10', taxaCambio: '900' })
    ).json();
    expect((await req('GET', `/api/movimentos?empresaId=${alfa.id}`)).json().total).toBe(2);
    expect((await req('PATCH', `/api/movimentos/${saida.id}`, { valor: '1' })).statusCode).toBe(409);
  });

  it('dashboard: movimentos normais contam, transferências não (sem dupla contagem)', async () => {
    const { req, alfa, baiA, binA, base, dashboard } = await setup();
    await req('POST', '/api/movimentos', { ...base, empresaId: alfa.id, carteiraId: baiA.id, tipo: 'ENTRADA', valor: '5000' });
    await req('POST', '/api/movimentos', { ...base, empresaId: alfa.id, carteiraId: binA.id, tipo: 'SAIDA', valor: '20' });
    await req('POST', '/api/transferencias', { ...base, origemCarteiraId: binA.id, destinoCarteiraId: baiA.id, valorEnviado: '100', taxaCambio: '900' });
    const d = await dashboard(alfa.id);
    expect(d.porMoeda).toEqual([
      { moeda: 'AOA', entradas: '5000', saidas: '0', liquido: '5000' },
      { moeda: 'USDT', entradas: '0', saidas: '20', liquido: '-20' },
    ]);
    expect(d.saldos.porMoeda).toEqual([
      { moeda: 'AOA', saldo: '195000' }, // 100000 + 5000 + 90000
      { moeda: 'USDT', saldo: '380' }, // 500 − 20 − 100
    ]);
  });
});
