// Data local de hoje em "aaaa-mm-dd".
export function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "2026-10-15T00:00:00.000Z" ou "2026-10-15" → "15/10/2026" (sem conversão de fuso).
export function formatData(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
