import type { Saldos } from '../../api/movimentos';
import { formatValor } from '../../lib/money';

export function SaldosResumo({ saldos }: { saldos: Saldos | null }) {
  if (!saldos) return <p className="text-sm text-slate-500">A carregar saldos…</p>;
  const visiveis = saldos.carteiras.filter((c) => c.ativa || c.saldo !== '0');

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Saldos</h2>
      <div className="grid grid-cols-2 gap-2">
        {saldos.porMoeda.map((m) => (
          <div key={m.moeda} className="rounded-xl bg-slate-900 p-3 text-white">
            <div className="text-xs opacity-70">Total {m.moeda}</div>
            <div className={`text-lg font-semibold tabular-nums ${m.saldo.startsWith('-') ? 'text-red-300' : ''}`}>
              {formatValor(m.saldo)}
            </div>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {visiveis.map((c) => (
          <li key={c.id} className={`flex items-center justify-between px-4 py-2.5 ${c.ativa ? '' : 'opacity-60'}`}>
            <span className="truncate text-sm">{c.nome}</span>
            <span className={`text-sm font-medium tabular-nums ${c.saldo.startsWith('-') ? 'text-red-600' : ''}`}>
              {formatValor(c.saldo, c.moeda)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
