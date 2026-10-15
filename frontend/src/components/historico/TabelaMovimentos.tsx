import type { Movimento } from '../../api/movimentos';
import { formatData } from '../../lib/date';
import { formatValor } from '../../lib/money';

interface Props {
  movimentos: Movimento[];
  onEditar: (m: Movimento) => void;
}

const sinal = (m: Movimento) => (m.tipo === 'ENTRADA' ? '+' : '−');
const corValor = (m: Movimento) => (m.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-red-700');

// Lista em cartões no telemóvel; tabela a partir de md.
export function TabelaMovimentos({ movimentos, onEditar }: Props) {
  return (
    <>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white md:hidden">
        {movimentos.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onEditar(m)} disabled={!!m.transferenciaId} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
              <span className="min-w-0">
                <span className="block truncate text-sm">{[m.categoria?.nome, m.destino?.nome].filter(Boolean).join(' · ') || 'Sem categoria'}</span>
                <span className="block truncate text-xs text-slate-500">
                  {formatData(m.data)} · {m.carteira.nome}
                  {m.descricao ? ` · ${m.descricao}` : ''}
                  {m.transferenciaId ? ' · transferência' : ''}
                </span>
              </span>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${corValor(m)}`}>
                {sinal(m)}
                {formatValor(m.valor, m.moeda)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Carteira</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Destino</th>
              <th className="px-3 py-2 font-medium">Nota</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimentos.map((m) => (
              <tr
                key={m.id}
                onClick={() => !m.transferenciaId && onEditar(m)}
                className={m.transferenciaId ? 'text-slate-500' : 'cursor-pointer hover:bg-slate-50'}
              >
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatData(m.data)}</td>
                <td className="px-3 py-2">{m.carteira.nome}</td>
                <td className="px-3 py-2">{m.categoria?.nome ?? '—'}</td>
                <td className="px-3 py-2">{m.destino?.nome ?? '—'}</td>
                <td className="max-w-[16rem] truncate px-3 py-2 text-slate-600">
                  {m.transferenciaId ? 'Transferência' : (m.descricao ?? '')}
                </td>
                <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${corValor(m)}`}>
                  {sinal(m)}
                  {formatValor(m.valor, m.moeda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
