import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { taxasApi, type Taxa } from '../../api/dashboard';
import { formatData, hoje } from '../../lib/date';
import { formatValor, parseValor } from '../../lib/money';
import { Button, ErrorText, Field, Input } from '../ui';

export function TaxasSection() {
  const [taxas, setTaxas] = useState<Taxa[] | null>(null);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const valorApi = parseValor(valor);

  const carregar = useCallback(async () => {
    try {
      setTaxas(await taxasApi.list());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valorApi || !/[1-9]/.test(valorApi)) return setErro('Indique uma taxa maior que zero.');
    setErro(null);
    setAGuardar(true);
    try {
      await taxasApi.create(valorApi, data === hoje() ? undefined : data);
      setValor('');
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar');
    } finally {
      setAGuardar(false);
    }
  }

  const atual = taxas?.[0];

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Taxa USDT → AOA</h2>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">Taxa atual (usada nas estimativas)</div>
        <div className="text-xl font-semibold tabular-nums">
          {atual ? `1 USDT = ${formatValor(atual.valor, 'AOA')}` : 'Sem taxa registada'}
        </div>
        {atual && <div className="text-xs text-slate-500">desde {formatData(atual.data)}</div>}
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="AOA por 1 USDT" hint={valorApi ? `= ${formatValor(valorApi, 'AOA')}` : undefined}>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Field>
        </div>
        <ErrorText>{erro}</ErrorText>
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Registar taxa'}
        </Button>
      </form>

      {taxas && taxas.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {taxas.map((t) => (
            <li key={t.id} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500">{formatData(t.data)}</span>
              <span className="tabular-nums">{formatValor(t.valor, 'AOA')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
