import { useState } from 'react';
import { categoriasApi, TIPO_CATEGORIA, type Categoria, type TipoCategoria } from '../../api/cadastros';
import { useLista } from '../../lib/useLista';
import { Field, Input, Select } from '../ui';
import { CrudList, type FormProps } from './CrudList';
import { FormActions } from './FormActions';
import { useSubmit } from './useSubmit';

type Valores = { nome: string; tipo: TipoCategoria };

function CategoriaForm({ inicial, onSubmit, onCancel }: FormProps<Categoria, Valores>) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipo, setTipo] = useState<TipoCategoria>(inicial?.tipo ?? 'AMBOS');
  const { submitting, onSubmit: submit } = useSubmit(() => onSubmit({ nome, tipo }));
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nome" hint="Finalidade: salários, fornecedor, venda…">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      </Field>
      <Field label="Usada em">
        <Select value={tipo} onChange={setTipo} options={TIPO_CATEGORIA} />
      </Field>
      <FormActions onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function CategoriasSection({ empresaId }: { empresaId: string }) {
  const { itens, erro, recarregar } = useLista(empresaId, categoriasApi.list);
  return (
    <CrudList<Categoria, Valores>
      titulo="Categorias"
      itens={itens}
      erroCarregar={erro}
      ativo={(c) => c.ativa}
      resumo={(c) => TIPO_CATEGORIA[c.tipo]}
      Form={CategoriaForm}
      criar={(v) => categoriasApi.create({ ...v, empresaId })}
      atualizar={categoriasApi.update}
      alternarAtivo={(c) => categoriasApi.update(c.id, { ativa: !c.ativa })}
      eliminar={categoriasApi.remove}
      depois={recarregar}
    />
  );
}
