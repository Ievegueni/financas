export type PresetPeriodo = 'mes' | 'mesPassado' | '30dias' | 'ano' | 'tudo' | 'personalizado';

export const PRESETS: Record<PresetPeriodo, string> = {
  mes: 'Este mês',
  mesPassado: 'Mês passado',
  '30dias': '30 dias',
  ano: 'Este ano',
  tudo: 'Tudo',
  personalizado: 'Personalizado',
};

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Intervalo [de, ate] (inclusivo, datas locais) de cada preset.
export function intervalo(preset: Exclude<PresetPeriodo, 'personalizado'>, agora = new Date()) {
  const y = agora.getFullYear();
  const m = agora.getMonth();
  switch (preset) {
    case 'mes':
      return { de: iso(new Date(y, m, 1)), ate: iso(new Date(y, m + 1, 0)) };
    case 'mesPassado':
      return { de: iso(new Date(y, m - 1, 1)), ate: iso(new Date(y, m, 0)) };
    case '30dias':
      return { de: iso(new Date(y, m, agora.getDate() - 29)), ate: iso(agora) };
    case 'ano':
      return { de: iso(new Date(y, 0, 1)), ate: iso(new Date(y, 11, 31)) };
    case 'tudo':
      return { de: '', ate: '' };
  }
}
