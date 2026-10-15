import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { carteirasApi, categoriasApi, destinosApi } from '../api/cadastros';
import { movimentosApi, type Movimento, type Pagina } from '../api/movimentos';
import { CHAVES_FILTRO, FiltrosHistorico, type Filtros } from '../components/historico/Filtros';
import { TabelaMovimentos } from '../components/historico/TabelaMovimentos';
import { MovimentoForm } from '../components/registo/MovimentoForm';
import { Button, ErrorText } from '../components/ui';
import { useEmpresa } from '../lib/empresa';
import { useLista } from '../lib/useLista';

const POR_PAGINA = 50;

export function HistoricoPage() {
  const { empresa } = useEmpresa();
  if (!empresa) return <p className="text-slate-600">Crie ou ative uma empresa em Definições.</p>;
  return <Historico key={empresa.id} empresaId={empresa.id} />;
}

function Historico({ empresaId }: { empresaId: string }) {
  const [params, setParams] = useSearchParams();
  const carteiras = useLista(empresaId, carteirasApi.list);
  const categorias = useLista(empresaId, categoriasApi.list);
  const destinos = useLista(empresaId, destinosApi.list);
  const [pagina, setPagina] = useState<Pagina<Movimento> | null>(null);
  const [editar, setEditar] = useState<Movimento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros vivem no URL (sobrevivem a recarregar e podem ser partilhados).
  const filtros = useMemo(() => {
    const f: Filtros = {};
    for (const k of CHAVES_FILTRO) {
      const v = params.get(k);
      if (v) f[k] = v;
    }
    return f;
  }, [params]);
  const page = Math.max(1, Number(params.get('page')) || 1);

  const setFiltros = useCallback(
    (f: Filtros) => setParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>, { replace: true }),
    [setParams],
  );
  const irPara = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setPagina(await movimentosApi.list({ empresaId, ...filtros, page, limit: POR_PAGINA }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, [empresaId, filtros, page]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const cadastros = carteiras.itens && categorias.itens && destinos.itens;
  const inicio = pagina ? (pagina.page - 1) * pagina.limit + 1 : 0;
  const fim = pagina ? inicio + pagina.items.length - 1 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Histórico</h1>
      {cadastros && (
        <FiltrosHistorico
          filtros={filtros}
          onChange={setFiltros}
          carteiras={carteiras.itens!}
          categorias={categorias.itens!}
          destinos={destinos.itens!}
        />
      )}
      <ErrorText>{erro}</ErrorText>

      {!pagina ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : pagina.total === 0 ? (
        <p className="text-sm text-slate-500">Nenhum movimento encontrado.</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {inicio}–{fim} de {pagina.total}
          </p>
          <TabelaMovimentos movimentos={pagina.items} onEditar={setEditar} />
          {pagina.total > pagina.limit && (
            <div className="flex justify-between">
              <Button variant="secondary" disabled={page <= 1} onClick={() => irPara(page - 1)}>
                ← Anterior
              </Button>
              <Button variant="secondary" disabled={fim >= pagina.total} onClick={() => irPara(page + 1)}>
                Seguinte →
              </Button>
            </div>
          )}
        </>
      )}

      {editar && cadastros && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditar(null)}>
          <div
            role="dialog"
            aria-label="Editar movimento"
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-semibold">Editar movimento</h2>
            <MovimentoForm
              key={editar.id}
              empresaId={empresaId}
              carteiras={carteiras.itens!}
              categorias={categorias.itens!}
              destinos={destinos.itens!}
              inicial={editar}
              onCadastroCriado={async () => {
                await Promise.all([categorias.recarregar(), destinos.recarregar()]);
              }}
              onSubmit={async (input) => {
                await movimentosApi.update(editar.id, input);
                setEditar(null);
                await carregar();
              }}
              onCancel={() => setEditar(null)}
              onDelete={async () => {
                await movimentosApi.remove(editar.id);
                setEditar(null);
                await carregar();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
