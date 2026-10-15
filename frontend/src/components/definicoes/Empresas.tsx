import { useState } from 'react';
import { empresasApi, type Empresa } from '../../api/cadastros';
import { useEmpresa } from '../../lib/empresa';
import { Field, Input } from '../ui';
import { CrudList, type FormProps } from './CrudList';
import { FormActions } from './FormActions';
import { useSubmit } from './useSubmit';

type Valores = { nome: string; nif: string | null };

function EmpresaForm({ inicial, onSubmit, onCancel }: FormProps<Empresa, Valores>) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [nif, setNif] = useState(inicial?.nif ?? '');
  const { submitting, onSubmit: submit } = useSubmit(() => onSubmit({ nome, nif: nif.trim() || null }));
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      </Field>
      <Field label="NIF (opcional)">
        <Input value={nif} onChange={(e) => setNif(e.target.value)} inputMode="numeric" />
      </Field>
      <FormActions onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function EmpresasSection() {
  const { empresas, loading, recarregar } = useEmpresa();
  return (
    <CrudList<Empresa, Valores>
      titulo="Empresas"
      itens={loading ? null : empresas}
      ativo={(e) => e.ativa}
      resumo={(e) => (e.nif ? `NIF ${e.nif}` : 'Sem NIF')}
      Form={EmpresaForm}
      criar={empresasApi.create}
      atualizar={empresasApi.update}
      alternarAtivo={(e) => empresasApi.update(e.id, { ativa: !e.ativa })}
      eliminar={empresasApi.remove}
      depois={recarregar}
    />
  );
}
