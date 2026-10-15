import ExcelJS from 'exceljs';
import type { Moeda, PrismaClient } from '@prisma/client';
import { Decimal } from '../lib/decimal.js';
import { HttpError } from '../lib/errors.js';
import type { MovimentoFiltros } from '../schemas/movimentos.js';
import { filtrosWhere, movimentoInclude } from './movimentos.js';

export const MAX_LINHAS = 50_000;

const FORMATO: Record<Moeda, string> = { AOA: '#,##0.00', USDT: '#,##0.00######' };

// Excel guarda números em vírgula flutuante. Só escrevemos como número se a conversão
// for exata; caso contrário vai como texto, para nunca alterar o valor.
function celulaValor(v: Decimal): number | string {
  const n = v.toNumber();
  return new Decimal(n).eq(v) ? n : v.toFixed();
}

// "aaaa-mm-dd" → "dd/mm/aaaa"
const dataPt = (iso: string) => iso.split('-').reverse().join('/');

export async function exportarMovimentos(db: PrismaClient, filtros: MovimentoFiltros): Promise<{ buffer: Buffer; empresa: string }> {
  const empresa = await db.empresa.findUnique({ where: { id: filtros.empresaId } });
  if (!empresa) throw new HttpError(400, 'Empresa inválida');

  const where = filtrosWhere(filtros);
  const total = await db.movimento.count({ where });
  if (total > MAX_LINHAS) {
    throw new HttpError(400, `Demasiados movimentos (${total}). Reduza o período ou os filtros (máx. ${MAX_LINHAS}).`);
  }
  const movimentos = await db.movimento.findMany({
    where,
    orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
    include: movimentoInclude,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Controlo Financeiro';
  wb.created = new Date();

  const ws = wb.addWorksheet('Movimentos', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Data', key: 'data', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Tipo', key: 'tipo', width: 9 },
    { header: 'Carteira', key: 'carteira', width: 20 },
    { header: 'Moeda', key: 'moeda', width: 7 },
    { header: 'Valor', key: 'valor', width: 16 },
    { header: 'Valor c/ sinal', key: 'sinal', width: 16 },
    { header: 'Categoria', key: 'categoria', width: 18 },
    { header: 'Destino', key: 'destino', width: 18 },
    { header: 'Taxa câmbio (AOA/USDT)', key: 'taxa', width: 14 },
    { header: 'Transferência', key: 'transferencia', width: 13 },
    { header: 'Nota', key: 'nota', width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  const totais = new Map<Moeda, { entradas: Decimal; saidas: Decimal }>();
  for (const m of movimentos) {
    const valor = new Decimal(m.valor);
    const row = ws.addRow({
      // Datas guardadas a meia-noite UTC; exceljs escreve em UTC, por isso o dia mantém-se.
      data: m.data,
      tipo: m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
      carteira: m.carteira.nome,
      moeda: m.moeda,
      valor: celulaValor(valor),
      sinal: celulaValor(m.tipo === 'ENTRADA' ? valor : valor.negated()),
      categoria: m.categoria?.nome ?? '',
      destino: m.destino?.nome ?? '',
      taxa: m.taxaCambio ? celulaValor(new Decimal(m.taxaCambio)) : '',
      transferencia: m.transferenciaId ? 'Sim' : '',
      nota: m.descricao ?? '',
    });
    row.getCell('valor').numFmt = FORMATO[m.moeda];
    row.getCell('sinal').numFmt = FORMATO[m.moeda];
    row.getCell('taxa').numFmt = '#,##0.00######';

    // Totais do resumo excluem transferências (como o dashboard).
    if (!m.transferenciaId) {
      const t = totais.get(m.moeda) ?? { entradas: new Decimal(0), saidas: new Decimal(0) };
      if (m.tipo === 'ENTRADA') t.entradas = t.entradas.plus(valor);
      else t.saidas = t.saidas.plus(valor);
      totais.set(m.moeda, t);
    }
  }
  if (movimentos.length) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
  }

  const resumo = wb.addWorksheet('Resumo');
  resumo.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }];
  const filtrosAplicados: [string, string][] = [
    ['Empresa', empresa.nome],
    ['De', filtros.de ? dataPt(filtros.de) : '—'],
    ['Até', filtros.ate ? dataPt(filtros.ate) : '—'],
  ];
  const nomes = async () => {
    const extra: [string, string][] = [];
    if (filtros.carteiraId) extra.push(['Carteira', (await db.carteira.findUnique({ where: { id: filtros.carteiraId } }))?.nome ?? '?']);
    if (filtros.moeda) extra.push(['Moeda', filtros.moeda]);
    if (filtros.tipo) extra.push(['Tipo', filtros.tipo === 'ENTRADA' ? 'Entradas' : 'Saídas']);
    if (filtros.categoriaId) extra.push(['Categoria', (await db.categoria.findUnique({ where: { id: filtros.categoriaId } }))?.nome ?? '?']);
    if (filtros.destinoId) extra.push(['Destino', (await db.destino.findUnique({ where: { id: filtros.destinoId } }))?.nome ?? '?']);
    if (filtros.q) extra.push(['Pesquisa', filtros.q]);
    return extra;
  };
  resumo.addRow(['Controlo Financeiro — exportação de movimentos']).font = { bold: true, size: 13 };
  resumo.addRow([]);
  for (const [k, v] of [...filtrosAplicados, ...(await nomes()), ['Movimentos', String(movimentos.length)]]) {
    resumo.addRow([k, v]).getCell(1).font = { bold: true };
  }
  resumo.addRow([]);
  resumo.addRow(['Totais', 'Entradas', 'Saídas', 'Líquido']).font = { bold: true };
  for (const moeda of ['AOA', 'USDT'] as Moeda[]) {
    const t = totais.get(moeda);
    if (!t) continue;
    const row = resumo.addRow([moeda, celulaValor(t.entradas), celulaValor(t.saidas), celulaValor(t.entradas.minus(t.saidas))]);
    for (const c of [2, 3, 4]) row.getCell(c).numFmt = FORMATO[moeda];
  }
  resumo.addRow([]);
  resumo.addRow(['Totais excluem transferências e câmbios entre carteiras.']).font = { italic: true, color: { argb: 'FF666666' } };

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, empresa: empresa.nome };
}
