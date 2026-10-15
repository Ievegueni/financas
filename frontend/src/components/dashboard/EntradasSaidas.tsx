import type { Dashboard } from '../../api/dashboard';
import { formatValor } from '../../lib/money';
import { Barra } from './Barra';

// Um cartão por moeda: nunca misturar escalas de AOA e USDT no mesmo eixo.
export function EntradasSaidas({ porMoeda }: { porMoeda: Dashboard['porMoeda'] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Entradas vs saídas</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {porMoeda.map((m) => {
          const max = Math.max(Number(m.entradas), Number(m.saidas));
          const linhas = [
            { label: 'Entradas', valor: m.entradas, cor: 'bg-emerald-600' },
            { label: 'Saídas', valor: m.saidas, cor: 'bg-red-600' },
          ];
          return (
            <div key={m.moeda} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-500">{m.moeda}</div>
              {linhas.map((l) => (
                <div key={l.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${l.cor}`} aria-hidden />
                      {l.label}
                    </span>
                    <span className="font-medium tabular-nums">{formatValor(l.valor)}</span>
                  </div>
                  <Barra valor={l.valor} max={max} cor={l.cor} titulo={`${l.label}: ${formatValor(l.valor, m.moeda)}`} />
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
                <span className="text-slate-600">Líquido</span>
                <span className="font-semibold tabular-nums">{formatValor(m.liquido, m.moeda)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
