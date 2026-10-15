import { Link } from 'react-router-dom';
import type { Dashboard } from '../../api/dashboard';
import { formatData } from '../../lib/date';
import { formatValor } from '../../lib/money';

export function Estimativa({ e }: { e: Dashboard['estimativaAOA'] }) {
  if (!e.taxa) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        Sem taxa USDT→AOA registada: não há estimativa em AOA.{' '}
        <Link to="/definicoes?tab=taxa" className="font-medium text-slate-900 underline">
          Registar taxa
        </Link>
      </div>
    );
  }
  const linhas = [
    { label: 'Entradas no período', valor: e.entradas },
    { label: 'Saídas no período', valor: e.saidas },
  ];
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Estimativa em AOA</h2>
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">estimativa</span>
      </div>
      <div>
        <div className="text-sm text-slate-500">Saldo total</div>
        <div className="text-2xl font-semibold tabular-nums">≈ {formatValor(e.saldo ?? '0', 'AOA')}</div>
      </div>
      {linhas.map((l) => (
        <div key={l.label} className="flex justify-between text-sm">
          <span className="text-slate-600">{l.label}</span>
          <span className="tabular-nums">≈ {formatValor(l.valor ?? '0', 'AOA')}</span>
        </div>
      ))}
      <p className="text-xs text-slate-500">
        Taxa 1 USDT = {formatValor(e.taxa.valor, 'AOA')} ({formatData(e.taxa.data)}). Valores reais por moeda acima.
      </p>
    </section>
  );
}
