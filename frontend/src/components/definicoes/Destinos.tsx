import { useState } from 'react';
import { destinosApi, TIPO_DESTINO, type Destino, type TipoDestino } from '../../api/cadastros';
import { useLista } from '../../lib/useLista';
import { Field, Input, Select } from '../ui';
import { CrudList, type FormProps } from './CrudList';
import { FormActions } from './FormActions';
import { useSubmit } from './useSubmit';

type Valores = { nome: string; tipo: TipoDestino };

function DestinoForm({ inicial, onSubmit, onCancel }: FormProps<Destino, Valores>) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipo, setTipo] = useState<TipoDestino>(inicial?.tipo ?? 'OUTRO');
  const { submitting, onSubmit: submit } = useSubmit(() => onSubmit({ nome, tipo }));
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nome" hint="Para onde vai o dinheiro: pessoa, fornecedor, cliente…">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      </Field>
      <Field label="Tipo">
        <Select value={tipo} onChange={setTipo} options={TIPO_DESTINO} />
      </Field>
      <FormActions onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function DestinosSection({ empresaId }: { empresaId: string }) {
  const { itens, erro, recarregar } = useLista(empresaId, destinosApi.list);
  return (
    <CrudList<Destino, Valores>
      titulo="Destinos"
      itens={itens}
      erroCarregar={erro}
      ativo={(d) => d.ativo}
      resumo={(d) => TIPO_DESTINO[d.tipo]}
      Form={DestinoForm}
      criar={(v) => destinosApi.create({ ...v, empresaId })}
      atualizar={destinosApi.update}
      alternarAtivo={(d) => destinosApi.update(d.id, { ativo: !d.ativo })}
      eliminar={destinosApi.remove}
      depois={recarregar}
    />
  );
}
