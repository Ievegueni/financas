import { useState, type ReactNode } from 'react';
import { Badge, Button, ErrorText } from '../ui';

export interface FormProps<T, V> {
  inicial: T | null;
  onSubmit: (values: V) => Promise<void>;
  onCancel: () => void;
}

interface Props<T extends { id: string; nome: string }, V> {
  titulo: string;
  itens: T[] | null;
  erroCarregar?: string | null;
  ativo: (item: T) => boolean;
  resumo: (item: T) => ReactNode;
  Form: (props: FormProps<T, V>) => ReactNode;
  criar: (values: V) => Promise<unknown>;
  atualizar: (id: string, values: V) => Promise<unknown>;
  alternarAtivo: (item: T) => Promise<unknown>;
  eliminar: (id: string) => Promise<unknown>;
  depois: () => Promise<void>; // recarregar após cada alteração
}

export function CrudList<T extends { id: string; nome: string }, V>(p: Props<T, V>) {
  const [editar, setEditar] = useState<string | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(acao: () => Promise<unknown>, fechar = true) {
    setErro(null);
    try {
      await acao();
      await p.depois();
      if (fechar) setEditar(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado');
      throw e;
    }
  }

  // O formulário trata o erro (mantém-se aberto); aqui só o mostramos.
  const submit = (fn: () => Promise<unknown>) => executar(fn).catch(() => undefined);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{p.titulo}</h2>
        {editar !== 'novo' && (
          <Button onClick={() => (setErro(null), setEditar('novo'))}>Novo</Button>
        )}
      </div>

      <ErrorText>{p.erroCarregar ?? (editar === null ? erro : null)}</ErrorText>

      {editar === 'novo' && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <p.Form inicial={null} onSubmit={(v) => submit(() => p.criar(v))} onCancel={() => setEditar(null)} />
          <ErrorText>{erro}</ErrorText>
        </div>
      )}

      {p.itens === null ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : p.itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nada registado.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {p.itens.map((item) =>
            editar === item.id ? (
              <li key={item.id} className="space-y-2 p-4">
                <p.Form
                  inicial={item}
                  onSubmit={(v) => submit(() => p.atualizar(item.id, v))}
                  onCancel={() => setEditar(null)}
                />
                <ErrorText>{erro}</ErrorText>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Button variant="secondary" onClick={() => submit(() => p.alternarAtivo(item))}>
                    {p.ativo(item) ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Eliminar "${item.nome}"?`)) void submit(() => p.eliminar(item.id));
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ) : (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => (setErro(null), setEditar(item.id))}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${p.ativo(item) ? '' : 'opacity-60'}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.nome} {!p.ativo(item) && <Badge>inativo</Badge>}
                    </span>
                    <span className="block text-sm text-slate-500">{p.resumo(item)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-400">Editar</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
