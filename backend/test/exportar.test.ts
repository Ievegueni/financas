import ExcelJS from 'exceljs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authedApp, prisma, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const ctx = await authedApp();
  const empresa = await prisma.empresa.create({ data: { nome: 'Alfa & Filhos, Lda' } });
  const aoa = await prisma.carteira.create({ data: { empresaId: empresa.id, nome: 'BAI', tipo: 'BANCO', moeda: 'AOA' } });
  const usdt = await prisma.carteira.create({ data: { empresaId: empresa.id, nome: 'Binance', tipo: 'WALLET_BINANCE', moeda: 'USDT' } });
  const venda = await prisma.categoria.create({ data: { empresaId: empresa.id, nome: 'Venda' } });
  const joao = await prisma.destino.create({ data: { empresaId: empresa.id, nome: 'João' } });
  const base = { empresaId: empresa.id };
  const mov = (data: object) =>
    prisma.movimento.create({ data: { ...base, carteiraId: aoa.id, moeda: 'AOA', tipo: 'SAIDA', valor: '1', data: new Date('2026-10-10'), ...data } });

  await mov({ tipo: 'ENTRADA', valor: '1250000.50', categoriaId: venda.id, data: new Date('2026-10-01'), descricao: 'Fatura 7' });
  await mov({ valor: '300', destinoId: joao.id, data: new Date('2026-10-05') });
  await mov({ carteiraId: usdt.id, moeda: 'USDT', tipo: 'ENTRADA', valor: '100.12345678', data: new Date('2026-10-12') });
  await mov({ valor: '999', eliminadoEm: new Date() });
  await mov({ carteiraId: usdt.id, moeda: 'USDT', valor: '10', transferenciaId: 't1', taxaCambio: '930', data: new Date('2026-10-15') });
  await mov({ tipo: 'ENTRADA', valor: '9300', transferenciaId: 't1', taxaCambio: '930', data: new Date('2026-10-15') });
  await mov({ valor: '50', data: new Date('2026-09-01') });
  return { ...ctx, empresa, usdt };
}

async function ler(payload: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(payload as unknown as ArrayBuffer);
  const ws = wb.getWorksheet('Movimentos')!;
  const linhas: unknown[][] = [];
  ws.eachRow((row) => linhas.push((row.values as unknown[]).slice(1)));
  const resumo: unknown[][] = [];
  wb.getWorksheet('Resumo')!.eachRow((row) => resumo.push((row.values as unknown[]).slice(1)));
  return { ws, linhas, resumo };
}

const url = (p: Record<string, string>) => `/api/exportar/movimentos.xlsx?${new URLSearchParams(p)}`;

describe('GET /exportar/movimentos.xlsx', () => {
  it('gera xlsx com cabeçalho, linhas não eliminadas e nome de ficheiro', async () => {
    const { req, empresa } = await setup();
    const res = await req('GET', url({ empresaId: empresa.id }));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="movimentos-alfa-filhos-lda-\d{4}-\d{2}-\d{2}\.xlsx"/);

    const { linhas, ws } = await ler(res.rawPayload);
    expect(linhas[0]).toEqual([
      'Data', 'Tipo', 'Carteira', 'Moeda', 'Valor', 'Valor c/ sinal', 'Categoria', 'Destino',
      'Taxa câmbio (AOA/USDT)', 'Transferência', 'Nota',
    ]);
    expect(linhas).toHaveLength(1 + 6); // 6 movimentos ativos

    const fatura = linhas.find((l) => l[10] === 'Fatura 7')!;
    expect(fatura.slice(1, 8)).toEqual(['Entrada', 'BAI', 'AOA', 1250000.5, 1250000.5, 'Venda', '']);
    expect((fatura[0] as Date).toISOString()).toBe('2026-10-01T00:00:00.000Z');

    const usdt = linhas.find((l) => l[2] === 'Binance' && l[1] === 'Entrada')!;
    expect(usdt[4]).toBe(100.12345678);
    const saidaJoao = linhas.find((l) => l[7] === 'João')!;
    expect(saidaJoao[5]).toBe(-300);
    const perna = linhas.find((l) => l[9] === 'Sim' && l[1] === 'Saída')!;
    expect(perna[8]).toBe(930);

    expect(ws.getRow(2).getCell(1).numFmt).toBe('dd/mm/yyyy');
    expect(ws.getCell('E2').numFmt).toMatch(/#,##0\.00/);
  });

  it('aplica os mesmos filtros do histórico', async () => {
    const { req, empresa, usdt } = await setup();
    const n = async (p: Record<string, string>) => (await ler((await req('GET', url({ empresaId: empresa.id, ...p }))).rawPayload)).linhas.length - 1;
    expect(await n({ moeda: 'USDT' })).toBe(2);
    expect(await n({ carteiraId: usdt.id, tipo: 'ENTRADA' })).toBe(1);
    expect(await n({ de: '2026-10-01', ate: '2026-10-10' })).toBe(2);
    expect(await n({ q: 'fatura' })).toBe(1);
    expect(await n({ de: '2030-01-01' })).toBe(0);
  });

  it('resumo com filtros e totais por moeda sem transferências', async () => {
    const { req, empresa } = await setup();
    const { resumo } = await ler((await req('GET', url({ empresaId: empresa.id, de: '2026-10-01', moeda: 'AOA' }))).rawPayload);
    const mapa = Object.fromEntries(resumo.filter((r) => r.length >= 2).map((r) => [r[0], r.slice(1)]));
    expect(mapa['Empresa']).toEqual(['Alfa & Filhos, Lda']);
    expect(mapa['De']).toEqual(['01/10/2026']);
    expect(mapa['Moeda']).toEqual(['AOA']);
    expect(mapa['AOA']).toEqual([1250000.5, 300, 1249700.5]); // sem a perna de 9300
    expect(mapa['Totais']).toEqual(['Entradas', 'Saídas', 'Líquido']);
    expect(mapa['USDT']).toBeUndefined();
  });

  it('valor que não cabe exatamente num número do Excel vai como texto', async () => {
    const { req, empresa, usdt } = await setup();
    await prisma.movimento.create({
      data: { empresaId: empresa.id, carteiraId: usdt.id, moeda: 'USDT', tipo: 'ENTRADA', valor: '123456789012.12345678', data: new Date('2026-10-20') },
    });
    const { linhas } = await ler((await req('GET', url({ empresaId: empresa.id }))).rawPayload);
    expect(linhas[1]![4]).toBe('123456789012.12345678');
  });

  it('exige sessão e empresaId válido', async () => {
    const { app, req } = await setup();
    expect((await app.inject({ method: 'GET', url: url({ empresaId: 'x' }) })).statusCode).toBe(401);
    expect((await req('GET', '/api/exportar/movimentos.xlsx')).statusCode).toBe(400);
    expect((await req('GET', url({ empresaId: 'nao-existe' }))).statusCode).toBe(400);
    expect((await req('GET', url({ empresaId: 'x', de: '01/10/2026' }))).statusCode).toBe(400);
  });
});
