import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { carteirasApi } from '../api/cadastros';
import { taxasApi } from '../api/dashboard';
import { saldosApi, type Saldos } from '../api/movimentos';
import { transferenciasApi } from '../api/transferencias';
import { CarteiraChips } from '../components/CarteiraChips';
import { SaldosResumo } from '../components/registo/SaldosResumo';
import { Button, ErrorText, Field, Input } from '../components/ui';
import { converter, positivo, taxaImplicita } from '../lib/cambio';
import { hoje } from '../lib/date';
import { useEmpresa } from '../lib/empresa';
import { formatValor, parseValor } from '../lib/money';
import { useLista } from '../lib/useLista';

export function TransferenciaPage() {
  const { empresa } = useEmpresa();
  if (!empresa) return <p className="text-slate-600">Crie ou ative uma empresa em Definições.</p>;
  return <Transferencia key={empresa.id} empresaId={empresa.id} />;
}

function Transferencia({ empresaId }: { empresaId: string }) {
  const { empresas } = useEmpresa();
  const empresasAtivas = empresas.filter((e) => e.ativa);
  const [destinoEmpresaId, setDestinoEmpresaId] = useState(empresaId);
  const origens = useLista(empresaId, carteirasApi.list);
  const destinos = useLista(destinoEmpresaId, carteirasApi.list);

  const [origemId, setOrigemId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [enviado, setEnviado] = useState('');
  // Em câmbio o utilizador indica a taxa OU o recebido; o outro é calculado.
  const [fonte, setFonte] = useState<'taxa' | 'recebido'>('taxa');
  const [taxaTxt, setTaxaTxt] = useState('');
  const [recebidoTxt, setRecebidoTxt] = useState('');
  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [saldos, setSaldos] = useState<Saldos | null>(null);

  const atualizarSaldos = useCallback(() => saldosApi.get(empresaId).then(setSaldos), [empresaId]);
  useEffect(() => {
    void atualizarSaldos();
    taxasApi
      .list()
      .then((t) => t[0] && setTaxaTxt(formatValor(t[0].valor)))
      .catch(() => undefined);
  }, [atualizarSaldos]);

  const origensAtivas = (origens.itens ?? []).filter((c) => c.ativa);
  const destinosAtivos = (destinos.itens ?? []).filter((c) => c.ativa && c.id !== origemId);
  const origem = origensAtivas.find((c) => c.id === origemId);
  const destino = destinosAtivos.find((c) => c.id === destinoId);
  const cambio = !!origem && !!destino && origem.moeda !== destino.moeda;

  const enviadoApi = parseValor(enviado);
  const taxaDigitada = parseValor(taxaTxt);
  const recebidoDigitado = parseValor(recebidoTxt);

  let taxaFinal: string | null = null;
  let recebidoFinal: string | null = null;
  if (origem && destino && positivo(enviadoApi)) {
    if (!cambio) {
      recebidoFinal = positivo(recebidoDigitado) ? recebidoDigitado : enviadoApi;
    } else if (fonte === 'taxa' && positivo(taxaDigitada)) {
      taxaFinal = taxaDigitada;
      recebidoFinal = converter(enviadoApi, origem.moeda, destino.moeda, taxaDigitada);
    } else if (fonte === 'recebido' && positivo(recebidoDigitado)) {
      recebidoFinal = recebidoDigitado;
      taxaFinal = taxaImplicita(enviadoApi, origem.moeda, recebidoDigitado);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!origem || !destino) return setErro('Escolha a carteira de origem e a de destino.');
    if (!positivo(enviadoApi)) return setErro('Indique o valor enviado.');
    if (!positivo(recebidoFinal)) return setErro(cambio ? 'Indique a taxa ou o valor recebido.' : 'Valor recebido inválido.');
    setErro(null);
    setAGuardar(true);
    try {
      await transferenciasApi.create({
        origemCarteiraId: origem.id,
        destinoCarteiraId: destino.id,
        valorEnviado: enviadoApi,
        valorRecebido: recebidoFinal,
        taxaCambio: taxaFinal,
        data,
        descricao: descricao.trim() || null,
      });
      setAviso(`${cambio ? 'Câmbio' : 'Transferência'} registad${cambio ? 'o' : 'a'}: ${formatValor(enviadoApi, origem.moeda)} → ${formatValor(recebidoFinal, destino.moeda)}.`);
      setEnviado('');
      setRecebidoTxt('');
      setDescricao('');
      await atualizarSaldos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar');
    } finally {
      setAGuardar(false);
    }
  }

  const empresaDestinoNome = empresasAtivas.find((e) => e.id === destinoEmpresaId)?.nome;
  const outraEmpresa = destinoEmpresaId !== empresaId;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">Transferência / Câmbio</h1>
        <p className="text-sm text-slate-500">Move dinheiro entre carteiras. Não conta como entrada nem saída no dashboard.</p>

        {origens.itens && <CarteiraChips label="De (origem)" carteiras={origensAtivas} value={origemId} onChange={setOrigemId} />}

        {empresasAtivas.length > 1 && (
          <Field label="Para a empresa">
            <select
              value={destinoEmpresaId}
              onChange={(e) => (setDestinoEmpresaId(e.target.value), setDestinoId(''))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
            >
              {empresasAtivas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                  {e.id === empresaId ? ' (esta)' : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        {destinos.itens && (
          <CarteiraChips label="Para (destino)" carteiras={destinosAtivos} value={destinoId} onChange={setDestinoId} />
        )}

        <Field label="Valor enviado" hint={positivo(enviadoApi) && origem ? `= ${formatValor(enviadoApi, origem.moeda)}` : undefined}>
          <div className="flex items-stretch">
            <Input value={enviado} onChange={(e) => setEnviado(e.target.value)} inputMode="decimal" placeholder="0,00" className="rounded-r-none text-lg" />
            <span className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-600">
              {origem?.moeda ?? '—'}
            </span>
          </div>
        </Field>

        {cambio ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Taxa (AOA por 1 USDT)">
              <Input
                aria-label="Taxa"
                inputMode="decimal"
                value={fonte === 'recebido' && taxaFinal ? formatValor(taxaFinal) : taxaTxt}
                onChange={(e) => (setTaxaTxt(e.target.value), setFonte('taxa'))}
              />
            </Field>
            <Field label={`Valor recebido (${destino!.moeda})`}>
              <Input
                aria-label="Valor recebido"
                inputMode="decimal"
                value={fonte === 'taxa' && recebidoFinal ? formatValor(recebidoFinal) : recebidoTxt}
                onChange={(e) => (setRecebidoTxt(e.target.value), setFonte('recebido'))}
              />
            </Field>
          </div>
        ) : (
          destino && (
            <Field label={`Valor recebido (${destino.moeda})`} hint="Deixe vazio se for igual ao enviado; menor se houver comissão.">
              <Input aria-label="Valor recebido" inputMode="decimal" value={recebidoTxt} onChange={(e) => setRecebidoTxt(e.target.value)} placeholder={enviado || '0,00'} />
            </Field>
          )
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Field>
          <Field label="Nota (opcional)">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} />
          </Field>
        </div>

        {origem && destino && positivo(enviadoApi) && positivo(recebidoFinal) && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm" aria-label="Resumo">
            Sai <strong>{formatValor(enviadoApi, origem.moeda)}</strong> de {origem.nome} → entra{' '}
            <strong>{formatValor(recebidoFinal, destino.moeda)}</strong> em {destino.nome}
            {outraEmpresa ? ` (${empresaDestinoNome})` : ''}
            {taxaFinal ? ` · taxa ${formatValor(taxaFinal)}` : ''}
          </p>
        )}

        <ErrorText>{erro ?? origens.erro ?? destinos.erro}</ErrorText>
        <Button type="submit" disabled={aGuardar} className="w-full py-3 text-base">
          {aGuardar ? 'A guardar…' : cambio ? 'Registar câmbio' : 'Registar transferência'}
        </Button>
        {aviso && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {aviso}
          </p>
        )}
      </form>
      <SaldosResumo saldos={saldos} />
    </div>
  );
}
