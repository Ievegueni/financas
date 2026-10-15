import { useRef, useState, type FormEvent } from 'react';
import { categoriasApi, destinosApi, type Carteira, type Categoria, type Destino } from '../../api/cadastros';
import type { Movimento, MovimentoInput, TipoMovimento } from '../../api/movimentos';
import { hoje } from '../../lib/date';
import { formatValor, parseValor } from '../../lib/money';
import { readStorage, writeStorage } from '../../lib/storage';
import { Button, ErrorText, Field, Input } from '../ui';
import { SelectComNovo } from './SelectComNovo';

interface Props {
  empresaId: string;
  carteiras: Carteira[];
  categorias: Categoria[];
  destinos: Destino[];
  inicial?: Movimento; // presente → modo edição
  onSubmit: (input: MovimentoInput) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
  onCadastroCriado: () => Promise<void>; // recarregar categorias/destinos
}

const carteiraKey = (empresaId: string) => `ultimaCarteira:${empresaId}`;

// Ordem dos campos (CLAUDE.md §5): Entrada/Saída → Carteira → Valor → Categoria → Destino → Data → Nota.
export function MovimentoForm(p: Props) {
  const ativas = p.carteiras.filter((c) => c.ativa || c.id === p.inicial?.carteiraId);
  const carteiraInicial =
    p.inicial?.carteiraId ??
    ativas.find((c) => c.id === readStorage(carteiraKey(p.empresaId)))?.id ??
    ativas[0]?.id ??
    '';

  const [tipo, setTipo] = useState<TipoMovimento>(p.inicial?.tipo ?? 'SAIDA');
  const [carteiraId, setCarteiraId] = useState(carteiraInicial);
  const [valor, setValor] = useState(p.inicial ? formatValor(p.inicial.valor) : '');
  const [categoriaId, setCategoriaId] = useState<string | null>(p.inicial?.categoriaId ?? null);
  const [destinoId, setDestinoId] = useState<string | null>(p.inicial?.destinoId ?? null);
  const [data, setData] = useState(p.inicial?.data.slice(0, 10) ?? hoje());
  const [descricao, setDescricao] = useState(p.inicial?.descricao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);

  const carteira = ativas.find((c) => c.id === carteiraId);
  const valorApi = parseValor(valor);

  const categoriasDisponiveis = p.categorias.filter(
    (c) => (c.ativa && (c.tipo === 'AMBOS' || c.tipo === tipo)) || c.id === p.inicial?.categoriaId,
  );
  const destinosDisponiveis = p.destinos.filter((d) => d.ativo || d.id === p.inicial?.destinoId);

  function mudarTipo(t: TipoMovimento) {
    setTipo(t);
    const cat = p.categorias.find((c) => c.id === categoriaId);
    if (cat && cat.tipo !== 'AMBOS' && cat.tipo !== t) setCategoriaId(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!carteira) return setErro('Escolha uma carteira.');
    if (!valorApi || !/[1-9]/.test(valorApi)) return setErro('Indique um valor maior que zero.');
    setErro(null);
    setAGuardar(true);
    try {
      await p.onSubmit({
        tipo,
        carteiraId,
        valor: valorApi,
        categoriaId,
        destinoId,
        data,
        descricao: descricao.trim() || null,
      });
      writeStorage(carteiraKey(p.empresaId), carteiraId);
      if (!p.inicial) {
        // Pronto para o próximo registo: mantém tipo, carteira e data.
        setValor('');
        setDescricao('');
        setCategoriaId(null);
        setDestinoId(null);
        valorRef.current?.focus();
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar');
    } finally {
      setAGuardar(false);
    }
  }

  async function eliminar() {
    if (!p.onDelete || !confirm('Eliminar este movimento?')) return;
    setAGuardar(true);
    try {
      await p.onDelete();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao eliminar');
      setAGuardar(false);
    }
  }

  if (ativas.length === 0) {
    return <p className="text-sm text-slate-500">Crie uma carteira em Definições para começar a registar.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
        {(['ENTRADA', 'SAIDA'] as const).map((t) => {
          const ativo = tipo === t;
          const cor = t === 'ENTRADA' ? 'bg-emerald-600 border-emerald-600' : 'bg-red-600 border-red-600';
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => mudarTipo(t)}
              className={`rounded-xl border py-3 text-base font-semibold ${ativo ? `${cor} text-white` : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {t === 'ENTRADA' ? '+ Entrada' : '− Saída'}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Carteira</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Carteira">
          {ativas.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === carteiraId}
              onClick={() => setCarteiraId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${c.id === carteiraId ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {c.nome} <span className="opacity-70">{c.moeda}</span>
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Valor"
        hint={valorApi && carteira ? `= ${formatValor(valorApi, carteira.moeda)}` : 'Use vírgula para decimais'}
      >
        <div className="flex items-stretch">
          <Input
            ref={valorRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            autoFocus={!p.inicial}
            className="rounded-r-none text-lg"
          />
          <span
            aria-label="Moeda"
            className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-600"
          >
            {carteira?.moeda}
          </span>
        </div>
      </Field>

      <SelectComNovo
        label="Categoria"
        novoLabel="Nova categoria"
        value={categoriaId}
        onChange={setCategoriaId}
        options={categoriasDisponiveis}
        onCriar={async (nome) => {
          const nova = await categoriasApi.create({ empresaId: p.empresaId, nome, tipo });
          await p.onCadastroCriado();
          return nova;
        }}
      />

      <SelectComNovo
        label="Destino"
        novoLabel="Novo destino"
        value={destinoId}
        onChange={setDestinoId}
        options={destinosDisponiveis}
        onCriar={async (nome) => {
          const novo = await destinosApi.create({ empresaId: p.empresaId, nome, tipo: 'OUTRO' });
          await p.onCadastroCriado();
          return novo;
        }}
      />

      <Field label="Data">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
      </Field>

      <Field label="Nota (opcional)">
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} />
      </Field>

      <ErrorText>{erro}</ErrorText>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={aGuardar} className="flex-1 py-3 text-base">
          {aGuardar ? 'A guardar…' : p.inicial ? 'Guardar alterações' : 'Registar'}
        </Button>
        {p.onCancel && (
          <Button variant="secondary" onClick={p.onCancel} className="py-3">
            Cancelar
          </Button>
        )}
        {p.onDelete && (
          <Button variant="danger" onClick={eliminar} disabled={aGuardar} className="py-3">
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
