// Barra horizontal fina. A largura é só visual (Number serve); valores mostrados vêm das strings.
export function Barra({ valor, max, cor, titulo }: { valor: string; max: number; cor: string; titulo: string }) {
  const pct = max > 0 ? Math.max((Number(valor) / max) * 100, Number(valor) > 0 ? 1.5 : 0) : 0;
  return (
    <div className="h-2.5 w-full rounded bg-slate-100" title={titulo}>
      <div className={`h-full rounded ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
