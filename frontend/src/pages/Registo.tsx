import { useCallback, useEffect, useState } from 'react';
import { carteirasApi, categoriasApi, destinosApi } from '../api/cadastros';
import { movimentosApi, saldosApi, type Movimento, type Saldos } from '../api/movimentos';
import { MovimentoForm } from '../components/registo/MovimentoForm';
import { SaldosResumo } from '../components/registo/SaldosResumo';
import { UltimosMovimentos } from '../components/registo/UltimosMovimentos';
import { ErrorText } from '../components/ui';
import { useEmpresa } from '../lib/empresa';
import { formatValor } from '../lib/money';
import { useLista } from '../lib/useLista';

export function RegistoPage() {
  const { empresa } = useEmpresa();
  if (!empresa) return <p className="text-slate-600">Crie ou ative uma empresa em Definições.</p>;
  return <Registo key={empresa.id} empresaId={empresa.id} />;
}

function Registo({ empresaId }: { empresaId: string }) {
  const carteiras = useLista(empresaId, carteirasApi.list);
  const categorias = useLista(empresaId, categoriasApi.list);
  const destinos = useLista(empresaId, destinosApi.list);
  const [saldos, setSaldos] = useState<Saldos | null>(null);
  const [recentes, setRecentes] = useState<Movimento[] | null>(null);
  const [editar, setEditar] = useState<Movimento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([saldosApi.get(empresaId), movimentosApi.recentes(empresaId)]);
      setSaldos(s);
      setRecentes(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, [empresaId]);

  useEffect(() => {
    void atualizar();
  }, [atualizar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  const recarregarCadastros = async () => {
    await Promise.all([categorias.recarregar(), destinos.recarregar()]);
  };

  const carregado = carteiras.itens && categorias.itens && destinos.itens;
  const formProps = carregado && {
    empresaId,
    carteiras: carteiras.itens!,
    categorias: categorias.itens!,
    destinos: destinos.itens!,
    onCadastroCriado: recarregarCadastros,
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">{editar ? 'Editar movimento' : 'Registo rápido'}</h1>
        <ErrorText>{erro ?? carteiras.erro ?? categorias.erro ?? destinos.erro}</ErrorText>
        {!formProps ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : editar ? (
          <MovimentoForm
            key={editar.id}
            {...formProps}
            inicial={editar}
            onSubmit={async (input) => {
              await movimentosApi.update(editar.id, input);
              setEditar(null);
              setAviso('Movimento atualizado.');
              await atualizar();
            }}
            onCancel={() => setEditar(null)}
            onDelete={async () => {
              await movimentosApi.remove(editar.id);
              setEditar(null);
              setAviso('Movimento eliminado.');
              await atualizar();
            }}
          />
        ) : (
          <MovimentoForm
            {...formProps}
            onSubmit={async (input) => {
              const m = await movimentosApi.create(empresaId, input);
              setAviso(`${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${formatValor(m.valor, m.moeda)} registada.`);
              await atualizar();
            }}
          />
        )}
        {aviso && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {aviso}
          </p>
        )}
      </section>

      <SaldosResumo saldos={saldos} />
      <UltimosMovimentos
        movimentos={recentes}
        onEditar={(m) => {
          setEditar(m);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
