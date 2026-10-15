import { useEffect, useState } from 'react';
import { TIPO_CATEGORIA, type Carteira, type Categoria, type Destino } from '../../api/cadastros';
import { Button, Input } from '../ui';

export const CHAVES_FILTRO = ['carteiraId', 'tipo', 'moeda', 'categoriaId', 'destinoId', 'de', 'ate', 'q'] as const;
export type Filtros = Partial<Record<(typeof CHAVES_FILTRO)[number], string>>;

interface Props {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  carteiras: Carteira[];
  categorias: Categoria[];
  destinos: Destino[];
}

const selCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base';

function Sel({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={selCls}>
      <option value="">{label}: todas</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function FiltrosHistorico({ filtros, onChange, carteiras, categorias, destinos }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(filtros.q ?? '');
  const set = (k: keyof Filtros, v: string) => onChange({ ...filtros, [k]: v || undefined });
  const ativos = CHAVES_FILTRO.filter((k) => k !== 'q' && filtros[k]).length;

  // Pesquisa com atraso para não pedir à API a cada tecla.
  useEffect(() => {
    if ((filtros.q ?? '') === texto) return;
    const t = setTimeout(() => onChange({ ...filtros, q: texto || undefined }), 300);
    return () => clearTimeout(t);
  }, [texto, filtros, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input type="search" placeholder="Pesquisar nota, categoria, destino…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Pesquisar" />
        <Button variant="secondary" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="shrink-0">
          Filtros{ativos ? ` (${ativos})` : ''}
        </Button>
      </div>
      {aberto && (
        <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
          <Sel label="Tipo" value={filtros.tipo} onChange={(v) => set('tipo', v)} options={[['ENTRADA', 'Entradas'], ['SAIDA', 'Saídas']]} />
          <Sel label="Moeda" value={filtros.moeda} onChange={(v) => set('moeda', v)} options={[['AOA', 'AOA'], ['USDT', 'USDT']]} />
          <Sel label="Carteira" value={filtros.carteiraId} onChange={(v) => set('carteiraId', v)} options={carteiras.map((c) => [c.id, `${c.nome} (${c.moeda})`])} />
          <Sel
            label="Categoria"
            value={filtros.categoriaId}
            onChange={(v) => set('categoriaId', v)}
            options={categorias.map((c) => [c.id, `${c.nome} · ${TIPO_CATEGORIA[c.tipo]}`])}
          />
          <Sel label="Destino" value={filtros.destinoId} onChange={(v) => set('destinoId', v)} options={destinos.map((d) => [d.id, d.nome])} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" aria-label="De" value={filtros.de ?? ''} onChange={(e) => set('de', e.target.value)} />
            <Input type="date" aria-label="Até" value={filtros.ate ?? ''} onChange={(e) => set('ate', e.target.value)} />
          </div>
          {(ativos > 0 || filtros.q) && (
            <Button variant="secondary" onClick={() => (setTexto(''), onChange({}))} className="sm:col-span-2">
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
