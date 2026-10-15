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
    data: { empresaId: empresa.id, nome: 'Binance', tipo: 'WALLET_BINANCE', moeda: 'USDT' },
  });
  const venda = await prisma.categoria.create({ data: { empresaId: empresa.id, nome: 'Venda', tipo: 'ENTRADA' } });
  const salarios = await prisma.categoria.create({
    data: { empresaId: empresa.id, nome: 'Salários', tipo: 'SAIDA' },
  });
  const outros = await prisma.categoria.create({ data: { empresaId: empresa.id, nome: 'Outros' } });
  const joao = await prisma.destino.create({ data: { empresaId: empresa.id, nome: 'João', tipo: 'PESSOA' } });
  const catOutra = await prisma.categoria.create({ data: { empresaId: outra.id, nome: 'Venda' } });
  const cartOutra = await prisma.carteira.create({
    data: { empresaId: outra.id, nome: 'BFA', tipo: 'BANCO', moeda: 'AOA' },
  });
  const base = { empresaId: empresa.id, data: '2026-10-15' };
  return { ...ctx, empresa, outra, aoa, usdt, venda, salarios, outros, joao, catOutra, cartOutra, base };
}

describe('POST /movimentos', () => {
  it('cria entrada em USDT com moeda derivada da carteira (ignora a do cliente)', async () => {
    const { req, usdt, venda, base } = await setup();
    const res = await req('POST', '/api/movimentos', {
      ...base,
      carteiraId: usdt.id,
      tipo: 'ENTRADA',
      valor: '150.12345678',
      moeda: 'AOA',
      categoriaId: venda.id,
      descricao: '  Pagamento cliente  ',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      moeda: 'USDT',
      valor: '150.12345678',
      data: '2026-10-15T00:00:00.000Z',
      descricao: 'Pagamento cliente',
      carteira: { nome: 'Binance' },
      categoria: { nome: 'Venda' },
      destino: null,
    });
  });

  it('valores minúsculos não saem em notação científica', async () => {
    const { req, usdt, base } = await setup();
    const res = await req('POST', '/api/movimentos', { ...base, carteiraId: usdt.id, tipo: 'ENTRADA', valor: '0.00000001' });
    expect(res.json().valor).toBe('0.00000001');
  });

  it.each([['0'], ['0.00'], ['-5'], ['abc'], ['1,5'], [10]])('valor %s → 400', async (valor) => {
    const { req, aoa, base } = await setup();
    const res = await req('POST', '/api/movimentos', { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor });
    expect(res.statusCode).toBe(400);
  });

  it('rejeita data inválida e tipo inválido', async () => {
    const { req, aoa, base } = await setup();
    const b = { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor: '1' };
    expect((await req('POST', '/api/movimentos', { ...b, data: '15/10/2026' })).statusCode).toBe(400);
    expect((await req('POST', '/api/movimentos', { ...b, data: '2026-13-45' })).statusCode).toBe(400);
    expect((await req('POST', '/api/movimentos', { ...b, tipo: 'OUTRO' })).statusCode).toBe(400);
  });

  it('carteira, categoria e destino têm de ser da mesma empresa', async () => {
    const { req, aoa, cartOutra, catOutra, base, outra } = await setup();
    const b = { ...base, tipo: 'ENTRADA', valor: '1' };
    expect((await req('POST', '/api/movimentos', { ...b, carteiraId: cartOutra.id })).statusCode).toBe(400);
    expect((await req('POST', '/api/movimentos', { ...b, carteiraId: aoa.id, categoriaId: catOutra.id })).statusCode).toBe(400);
    const destOutra = await prisma.destino.create({ data: { empresaId: outra.id, nome: 'X' } });
    expect((await req('POST', '/api/movimentos', { ...b, carteiraId: aoa.id, destinoId: destOutra.id })).statusCode).toBe(400);
    expect((await req('POST', '/api/movimentos', { ...b, carteiraId: 'nao-existe' })).statusCode).toBe(400);
  });

  it('categoria tem de ser compatível com o tipo', async () => {
    const { req, aoa, venda, salarios, outros, base } = await setup();
    const b = { ...base, carteiraId: aoa.id, valor: '1' };
    const res = await req('POST', '/api/movimentos', { ...b, tipo: 'SAIDA', categoriaId: venda.id });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Venda/);
    expect((await req('POST', '/api/movimentos', { ...b, tipo: 'ENTRADA', categoriaId: salarios.id })).statusCode).toBe(400);
    expect((await req('POST', '/api/movimentos', { ...b, tipo: 'SAIDA', categoriaId: outros.id })).statusCode).toBe(201);
    expect((await req('POST', '/api/movimentos', { ...b, tipo: 'SAIDA', categoriaId: salarios.id })).statusCode).toBe(201);
  });

  it('recusa carteira, categoria ou destino desativados', async () => {
    const { req, aoa, outros, joao, base } = await setup();
    const b = { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor: '1' };
    await prisma.categoria.update({ where: { id: outros.id }, data: { ativa: false } });
    await prisma.destino.update({ where: { id: joao.id }, data: { ativo: false } });
    expect((await req('POST', '/api/movimentos', { ...b, categoriaId: outros.id })).statusCode).toBe(400);
    expect((await req('POST', '/api/movimentos', { ...b, destinoId: joao.id })).statusCode).toBe(400);
    await prisma.carteira.update({ where: { id: aoa.id }, data: { ativa: false } });
    expect((await req('POST', '/api/movimentos', b)).statusCode).toBe(400);
  });
});

describe('PATCH / DELETE /movimentos/:id', () => {
  it('editar valor e mudar de carteira atualiza a moeda', async () => {
    const { req, aoa, usdt, base } = await setup();
    const mov = (await req('POST', '/api/movimentos', { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor: '10' })).json();
    const res = await req('PATCH', `/api/movimentos/${mov.id}`, { valor: '20.5', carteiraId: usdt.id, descricao: null });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ valor: '20.5', moeda: 'USDT', carteiraId: usdt.id, empresaId: base.empresaId });
  });

  it('mudar o tipo revalida a categoria existente', async () => {
    const { req, aoa, venda, base } = await setup();
    const mov = (
      await req('POST', '/api/movimentos', { ...base, carteiraId: aoa.id, tipo: 'ENTRADA', valor: '1', categoriaId: venda.id })
    ).json();
    expect((await req('PATCH', `/api/movimentos/${mov.id}`, { tipo: 'SAIDA' })).statusCode).toBe(400);
    expect((await req('PATCH', `/api/movimentos/${mov.id}`, { tipo: 'SAIDA', categoriaId: null })).statusCode).toBe(200);
  });

  it('editar outro campo não falha por a carteira entretanto ter sido desativada', async () => {
    const { req, aoa, base } = await setup();
    const mov = (await req('POST', '/api/movimentos', { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor: '1' })).json();
    await prisma.carteira.update({ where: { id: aoa.id }, data: { ativa: false } });
    expect((await req('PATCH', `/api/movimentos/${mov.id}`, { valor: '2' })).statusCode).toBe(200);
  });

  it('soft delete: some da lista, fica na BD, segundo delete dá 404', async () => {
    const { req, aoa, base, empresa } = await setup();
    const mov = (await req('POST', '/api/movimentos', { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor: '1' })).json();
    expect((await req('DELETE', `/api/movimentos/${mov.id}`)).statusCode).toBe(204);
    expect((await req('GET', `/api/movimentos?empresaId=${empresa.id}`)).json().total).toBe(0);
    expect((await prisma.movimento.findUnique({ where: { id: mov.id } }))?.eliminadoEm).toBeInstanceOf(Date);
    expect((await req('DELETE', `/api/movimentos/${mov.id}`)).statusCode).toBe(404);
    expect((await req('PATCH', `/api/movimentos/${mov.id}`, { valor: '2' })).statusCode).toBe(404);
  });

  it('pernas de transferência: não se editam aqui e eliminam-se juntas', async () => {
    const { req, aoa, usdt, empresa } = await setup();
    const comum = { empresaId: empresa.id, data: new Date(), transferenciaId: 't1' };
    const saida = await prisma.movimento.create({
      data: { ...comum, carteiraId: usdt.id, tipo: 'SAIDA', valor: '100', moeda: 'USDT' },
    });
    await prisma.movimento.create({
      data: { ...comum, carteiraId: aoa.id, tipo: 'ENTRADA', valor: '90000', moeda: 'AOA' },
    });
    expect((await req('PATCH', `/api/movimentos/${saida.id}`, { valor: '1' })).statusCode).toBe(409);
    expect((await req('DELETE', `/api/movimentos/${saida.id}`)).statusCode).toBe(204);
    expect(await prisma.movimento.count({ where: { transferenciaId: 't1', eliminadoEm: null } })).toBe(0);
  });

  it('lista mais recentes primeiro, com limite', async () => {
    const { req, aoa, empresa, base } = await setup();
    for (const data of ['2026-10-01', '2026-10-15', '2026-10-10']) {
      await req('POST', '/api/movimentos', { ...base, data, carteiraId: aoa.id, tipo: 'SAIDA', valor: '1' });
    }
    const lista = (await req('GET', `/api/movimentos?empresaId=${empresa.id}&limit=2`)).json();
    expect(lista).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(lista.items.map((m: { data: string }) => m.data.slice(0, 10))).toEqual(['2026-10-15', '2026-10-10']);
    const p2 = (await req('GET', `/api/movimentos?empresaId=${empresa.id}&limit=2&page=2`)).json();
    expect(p2.items.map((m: { data: string }) => m.data.slice(0, 10))).toEqual(['2026-10-01']);
  });
});

describe('GET /saldos', () => {
  it('saldoInicial + entradas − saídas, por carteira e por moeda, sem eliminados nem outras empresas', async () => {
    const { req, aoa, usdt, cartOutra, empresa, outra, base } = await setup();
    const add = (carteiraId: string, tipo: string, valor: string) =>
      req('POST', '/api/movimentos', { ...base, carteiraId, tipo, valor });

    await add(aoa.id, 'ENTRADA', '0.1');
    await add(aoa.id, 'ENTRADA', '0.2');
    await add(aoa.id, 'SAIDA', '250.30');
    const apagado = (await add(aoa.id, 'SAIDA', '999')).json();
    await req('DELETE', `/api/movimentos/${apagado.id}`);
    await add(usdt.id, 'ENTRADA', '100.12345678');
    await add(usdt.id, 'SAIDA', '0.00000001');
    await req('POST', '/api/movimentos', { ...base, empresaId: outra.id, carteiraId: cartOutra.id, tipo: 'ENTRADA', valor: '5' });

    // Carteira AOA extra desativada continua a contar no total da moeda.
    await prisma.carteira.create({
      data: { empresaId: empresa.id, nome: 'Caixa', tipo: 'OUTRO', moeda: 'AOA', saldoInicial: '50', ativa: false },
    });

    const res = await req('GET', `/api/saldos?empresaId=${empresa.id}`);
    expect(res.statusCode).toBe(200);
    const { carteiras, porMoeda } = res.json();
    const bai = carteiras.find((c: { nome: string }) => c.nome === 'BAI');
    expect(bai).toMatchObject({ saldoInicial: '1000', entradas: '0.3', saidas: '250.3', saldo: '750', moeda: 'AOA' });
    expect(carteiras.find((c: { nome: string }) => c.nome === 'Binance').saldo).toBe('100.12345677');
    expect(carteiras.find((c: { nome: string }) => c.nome === 'Caixa')).toMatchObject({ saldo: '50', ativa: false });
    expect(porMoeda).toEqual([
      { moeda: 'AOA', saldo: '800' },
      { moeda: 'USDT', saldo: '100.12345677' },
    ]);
  });

  it('saldo pode ficar negativo e carteira sem movimentos mostra o saldo inicial', async () => {
    const { req, aoa, empresa, base } = await setup();
    await req('POST', '/api/movimentos', { ...base, carteiraId: aoa.id, tipo: 'SAIDA', valor: '1500' });
    const { carteiras } = (await req('GET', `/api/saldos?empresaId=${empresa.id}`)).json();
    expect(carteiras.find((c: { nome: string }) => c.nome === 'BAI').saldo).toBe('-500');
    expect(carteiras.find((c: { nome: string }) => c.nome === 'Binance').saldo).toBe('0');
  });

  it('exige empresaId', async () => {
    const { req } = await authedApp();
    expect((await req('GET', '/api/saldos')).statusCode).toBe(400);
  });
});
