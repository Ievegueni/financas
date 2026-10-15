import { useState } from 'react';
import { carteirasApi, TIPO_CARTEIRA, type Carteira, type TipoCarteira } from '../../api/cadastros';
import { formatValor, parseValor, type Moeda } from '../../lib/money';
import { useLista } from '../../lib/useLista';
import { ErrorText, Field, Input, Select } from '../ui';
import { CrudList, type FormProps } from './CrudList';
import { FormActions } from './FormActions';
import { useSubmit } from './useSubmit';

type Valores = { nome: string; tipo: TipoCarteira; moeda: Moeda; saldoInicial: string };

const MOEDAS: Record<Moeda, string> = { AOA: 'AOA (Kwanza)', USDT: 'USDT' };

function CarteiraForm({ inicial, onSubmit, onCancel }: FormProps<Carteira, Valores>) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipo, setTipo] = useState<TipoCarteira>(inicial?.tipo ?? 'BANCO');
  const [moeda, setMoeda] = useState<Moeda>(inicial?.moeda ?? 'AOA');
  const [saldo, setSaldo] = useState(inicial ? formatValor(inicial.saldoInicial) : '0');
  const [erro, setErro] = useState<string | null>(null);
  const saldoInicial = parseValor(saldo);

  const { submitting, onSubmit: submit } = useSubmit(async () => {
    if (saldoInicial === null) return setErro('Saldo inicial inválido.');
    setErro(null);
    await onSubmit({ nome, tipo, moeda, saldoInicial });
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nome" hint='Ex.: "BAI Kwanzas", "Binance USDT"'>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select value={tipo} onChange={setTipo} options={TIPO_CARTEIRA} />
        </Field>
        <Field label="Moeda">
          <Select value={moeda} onChange={setMoeda} options={MOEDAS} />
        </Field>
      </div>
      <Field
        label="Saldo inicial"
        hint={saldoInicial !== null ? `= ${formatValor(saldoInicial, moeda)}` : 'Use vírgula para decimais'}
      >
        <Input value={saldo} onChange={(e) => setSaldo(e.target.value)} inputMode="decimal" />
      </Field>
      <ErrorText>{erro}</ErrorText>
      <FormActions onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function CarteirasSection({ empresaId }: { empresaId: string }) {
  const { itens, erro, recarregar } = useLista(empresaId, carteirasApi.list);
  return (
    <CrudList<Carteira, Valores>
      titulo="Carteiras"
      itens={itens}
      erroCarregar={erro}
      ativo={(c) => c.ativa}
      resumo={(c) => `${TIPO_CARTEIRA[c.tipo]} · saldo inicial ${formatValor(c.saldoInicial, c.moeda)}`}
      Form={CarteiraForm}
      criar={(v) => carteirasApi.create({ ...v, empresaId })}
      atualizar={carteirasApi.update}
      alternarAtivo={(c) => carteirasApi.update(c.id, { ativa: !c.ativa })}
      eliminar={carteirasApi.remove}
      depois={recarregar}
    />
  );
}
