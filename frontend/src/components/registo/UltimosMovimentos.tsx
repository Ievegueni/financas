import type { Movimento } from '../../api/movimentos';
import { formatData } from '../../lib/date';
import { formatValor } from '../../lib/money';

interface Props {
  movimentos: Movimento[] | null;
  onEditar: (m: Movimento) => void;
}

export function UltimosMovimentos({ movimentos, onEditar }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Últimos movimentos</h2>
      {movimentos === null ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : movimentos.length === 0 ? (
        <p className="text-sm text-slate-500">Ainda não há movimentos.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {movimentos.map((m) => {
            const entrada = m.tipo === 'ENTRADA';
            const detalhe = [m.categoria?.nome, m.destino?.nome, m.carteira.nome].filter(Boolean).join(' · ');
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onEditar(m)}
                  disabled={!!m.transferenciaId}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{detalhe}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {formatData(m.data)}
                      {m.descricao ? ` · ${m.descricao}` : ''}
                      {m.transferenciaId ? ' · transferência' : ''}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${entrada ? 'text-emerald-700' : 'text-red-700'}`}
                  >
                    {entrada ? '+' : '−'}
                    {formatValor(m.valor, m.moeda)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
