import type { Carteira } from '../api/cadastros';

interface Props {
  label: string;
  carteiras: Carteira[];
  value: string;
  onChange: (id: string) => void;
}

export function CarteiraChips({ label, carteiras, value, onChange }: Props) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {carteiras.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === value}
            onClick={() => onChange(c.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${c.id === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            {c.nome} <span className="opacity-70">{c.moeda}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
