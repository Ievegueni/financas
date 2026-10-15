import { PRESETS, type PresetPeriodo } from '../../lib/periodo';
import { Input } from '../ui';

interface Props {
  preset: PresetPeriodo;
  de: string;
  ate: string;
  onPreset: (p: PresetPeriodo) => void;
  onDatas: (de: string, ate: string) => void;
}

export function PeriodoSelector({ preset, de, ate, onPreset, onDatas }: Props) {
  return (
    <div className="space-y-2">
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4" role="radiogroup" aria-label="Período">
        {(Object.keys(PRESETS) as PresetPeriodo[]).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preset === p}
            onClick={() => onPreset(p)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${preset === p ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            {PRESETS[p]}
          </button>
        ))}
      </div>
      {preset === 'personalizado' && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" aria-label="De" value={de} onChange={(e) => onDatas(e.target.value, ate)} />
          <Input type="date" aria-label="Até" value={ate} onChange={(e) => onDatas(de, e.target.value)} />
        </div>
      )}
    </div>
  );
}
