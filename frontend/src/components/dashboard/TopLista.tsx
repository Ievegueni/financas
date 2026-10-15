import { useState } from 'react';
import type { Agrupado } from '../../api/dashboard';
import type { TipoMovimento } from '../../api/movimentos';
import { formatValor, type Moeda } from '../../lib/money';
import { Barra } from './Barra';

const TOP = 5;

// Top N por moeda (sem conversão entre moedas), para saídas ou entradas.
export function TopLista({ titulo, linhas }: { titulo: string; linhas: Agrupado[] }) {
  const [tipo, setTipo] = useState<TipoMovimento>('SAIDA');
  const moedas = (['AOA', 'USDT'] as Moeda[]).filter((m) => linhas.some((l) => l.moeda === m && l.tipo === tipo));

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <div className="flex gap-1" role="radiogroup" aria-label={`${titulo}: tipo`}>
          {(['SAIDA', 'ENTRADA'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => setTipo(t)}
              className={`rounded-full px-2.5 py-1 text-xs ${tipo === t ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}
            >
              {t === 'SAIDA' ? 'Saídas' : 'Entradas'}
            </button>
          ))}
        </div>
      </div>
      {moedas.length === 0 ? (
        <p className="text-sm text-slate-500">Sem {tipo === 'SAIDA' ? 'saídas' : 'entradas'} no período.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {moedas.map((moeda) => {
            const todas = linhas.filter((l) => l.moeda === moeda && l.tipo === tipo);
            const top = todas.slice(0, TOP);
            const restantes = todas.length - top.length;
            const max = Number(top[0]?.total ?? 0);
            return (
              <div key={moeda} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-500">{moeda}</div>
                {top.map((l) => (
                  <div key={l.id ?? 'sem'} className="space-y-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className={`truncate ${l.id ? 'text-slate-700' : 'italic text-slate-500'}`}>{l.nome}</span>
                      <span className="shrink-0 font-medium tabular-nums">{formatValor(l.total)}</span>
                    </div>
                    <Barra
                      valor={l.total}
                      max={max}
                      cor="bg-slate-700"
                      titulo={`${l.nome}: ${formatValor(l.total, moeda)} em ${l.count} movimento(s)`}
                    />
                  </div>
                ))}
                {restantes > 0 && <p className="text-xs text-slate-500">+ {restantes} outros</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
