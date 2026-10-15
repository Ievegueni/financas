import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authedApp, prisma, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const ctx = await authedApp();
  const empresa = (await ctx.req('POST', '/api/empresas', { nome: 'Alfa', nif: '5000000000' })).json();
  return { ...ctx, empresa };
}

async function criarMovimento(empresaId: string, carteiraId: string, extra: object = {}) {
  return prisma.movimento.create({
    data: { empresaId, carteiraId, tipo: 'ENTRADA', valor: '10', moeda: 'AOA', data: new Date(), ...extra },
  });
}

describe('empresas', () => {
  it('CRUD completo', async () => {
    const { req, empresa } = await setup();
    expect(empresa).toMatchObject({ nome: 'Alfa', nif: '5000000000', ativa: true });

    expect((await req('GET', '/api/empresas')).json()).toHaveLength(1);
    expect((await req('PATCH', `/api/empresas/${empresa.id}`, { ativa: false })).json().ativa).toBe(false);
    expect((await req('DELETE', `/api/empresas/${empresa.id}`)).statusCode).toBe(204);
    expect((await req('GET', `/api/empresas/${empresa.id}`)).statusCode).toBe(404);
  });

  it('exige sessão', async () => {
    const { app } = await authedApp();
    expect((await app.inject({ method: 'GET', url: '/api/empresas' })).statusCode).toBe(401);
  });

  it('nome vazio devolve 400', async () => {
    const { req } = await authedApp();
    expect((await req('POST', '/api/empresas', { nome: '  ' })).statusCode).toBe(400);
  });

  it('eliminar empresa sem movimentos leva os cadastros; com movimentos dá 409', async () => {
    const { req, empresa } = await setup();
    const cart = (
      await req('POST', '/api/carteiras', { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA' })
    ).json();
    await criarMovimento(empresa.id, cart.id);
    expect((await req('DELETE', `/api/empresas/${empresa.id}`)).statusCode).toBe(409);

    await prisma.movimento.deleteMany();
    await req('POST', '/api/categorias', { empresaId: empresa.id, nome: 'Venda' });
    expect((await req('DELETE', `/api/empresas/${empresa.id}`)).statusCode).toBe(204);
    expect(await prisma.carteira.count()).toBe(0);
    expect(await prisma.categoria.count()).toBe(0);
  });
});

describe('carteiras', () => {
  it('cria com saldo inicial em string decimal e lista por empresa', async () => {
    const { req, empresa } = await setup();
    const res = await req('POST', '/api/carteiras', {
      empresaId: empresa.id,
      nome: 'Binance USDT',
      tipo: 'WALLET_BINANCE',
      moeda: 'USDT',
      saldoInicial: '1250.12345678',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().saldoInicial).toBe('1250.12345678');

    const lista = (await req('GET', `/api/carteiras?empresaId=${empresa.id}`)).json();
    expect(lista).toHaveLength(1);
    expect((await req('GET', '/api/carteiras?empresaId=outra')).json()).toHaveLength(0);
    expect((await req('GET', '/api/carteiras')).statusCode).toBe(400);
  });

  it('saldo padrão é 0 e valores inválidos dão 400', async () => {
    const { req, empresa } = await setup();
    const base = { empresaId: empresa.id, nome: 'X', tipo: 'BANCO', moeda: 'AOA' };
    expect((await req('POST', '/api/carteiras', base)).json().saldoInicial).toBe('0');
    const minimo = await req('POST', '/api/carteiras', { ...base, nome: 'Min', saldoInicial: '0.00000001' });
    expect(minimo.json().saldoInicial).toBe('0.00000001');
    for (const saldoInicial of ['1,5', '-1', 'abc', '1.123456789', 1.5]) {
      const res = await req('POST', '/api/carteiras', { ...base, nome: `Y${saldoInicial}`, saldoInicial });
      expect(res.statusCode, String(saldoInicial)).toBe(400);
    }
  });

  it('nome duplicado na mesma empresa dá 409', async () => {
    const { req, empresa } = await setup();
    const body = { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA' };
    await req('POST', '/api/carteiras', body);
    expect((await req('POST', '/api/carteiras', body)).statusCode).toBe(409);
  });

  it('empresa inexistente dá 400', async () => {
    const { req } = await authedApp();
    const res = await req('POST', '/api/carteiras', { empresaId: 'nao-existe', nome: 'X', tipo: 'BANCO', moeda: 'AOA' });
    expect(res.statusCode).toBe(400);
  });

  it('não muda moeda nem elimina se houver movimentos', async () => {
    const { req, empresa } = await setup();
    const cart = (
      await req('POST', '/api/carteiras', { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA' })
    ).json();
    expect((await req('PATCH', `/api/carteiras/${cart.id}`, { moeda: 'USDT' })).statusCode).toBe(200);
    await req('PATCH', `/api/carteiras/${cart.id}`, { moeda: 'AOA' });

    await criarMovimento(empresa.id, cart.id);
    expect((await req('PATCH', `/api/carteiras/${cart.id}`, { moeda: 'USDT' })).statusCode).toBe(409);
    expect((await req('PATCH', `/api/carteiras/${cart.id}`, { nome: 'BAI Kwanzas' })).statusCode).toBe(200);
    expect((await req('DELETE', `/api/carteiras/${cart.id}`)).statusCode).toBe(409);
    expect((await req('PATCH', `/api/carteiras/${cart.id}`, { ativa: false })).json().ativa).toBe(false);
  });

  it('empresaId não é alterável', async () => {
    const { req, empresa } = await setup();
    const outra = (await req('POST', '/api/empresas', { nome: 'Beta' })).json();
    const cart = (
      await req('POST', '/api/carteiras', { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA' })
    ).json();
    const res = await req('PATCH', `/api/carteiras/${cart.id}`, { empresaId: outra.id });
    expect(res.json().empresaId).toBe(empresa.id);
  });
});

describe('categorias e destinos', () => {
  it('categoria: tipo padrão AMBOS, edição e eliminação', async () => {
    const { req, empresa } = await setup();
    const cat = (await req('POST', '/api/categorias', { empresaId: empresa.id, nome: 'Venda' })).json();
    expect(cat.tipo).toBe('AMBOS');
    expect((await req('PATCH', `/api/categorias/${cat.id}`, { tipo: 'ENTRADA' })).json().tipo).toBe('ENTRADA');
    expect((await req('POST', '/api/categorias', { empresaId: empresa.id, nome: 'X', tipo: 'NADA' })).statusCode).toBe(
      400,
    );
    expect((await req('DELETE', `/api/categorias/${cat.id}`)).statusCode).toBe(204);
  });

  it('mesmo nome é permitido em empresas diferentes', async () => {
    const { req, empresa } = await setup();
    const outra = (await req('POST', '/api/empresas', { nome: 'Beta' })).json();
    expect((await req('POST', '/api/categorias', { empresaId: empresa.id, nome: 'Venda' })).statusCode).toBe(201);
    expect((await req('POST', '/api/categorias', { empresaId: outra.id, nome: 'Venda' })).statusCode).toBe(201);
  });

  it('destino em uso não pode ser eliminado', async () => {
    const { req, empresa } = await setup();
    const dest = (
      await req('POST', '/api/destinos', { empresaId: empresa.id, nome: 'João', tipo: 'PESSOA' })
    ).json();
    expect(dest).toMatchObject({ tipo: 'PESSOA', ativo: true });
    const cart = await prisma.carteira.create({
      data: { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA' },
    });
    await criarMovimento(empresa.id, cart.id, { destinoId: dest.id });
    expect((await req('DELETE', `/api/destinos/${dest.id}`)).statusCode).toBe(409);
    expect((await req('PATCH', `/api/destinos/${dest.id}`, { ativo: false })).json().ativo).toBe(false);
  });
});
