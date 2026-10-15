import { useEffect, useState } from 'react';
import { dashboardApi, type Dashboard } from '../api/dashboard';
import { EntradasSaidas } from '../components/dashboard/EntradasSaidas';
import { Estimativa } from '../components/dashboard/Estimativa';
import { PeriodoSelector } from '../components/dashboard/PeriodoSelector';
import { TopLista } from '../components/dashboard/TopLista';
import { SaldosResumo } from '../components/registo/SaldosResumo';
import { ErrorText } from '../components/ui';
import { useEmpresa } from '../lib/empresa';
import { intervalo, type PresetPeriodo } from '../lib/periodo';
import { readStorage, writeStorage } from '../lib/storage';

export function DashboardPage() {
  const { empresa } = useEmpresa();
  const [preset, setPreset] = useState<PresetPeriodo>(() => (readStorage('dashboardPeriodo') as PresetPeriodo) || 'mes');
  const [datas, setDatas] = useState(() => (preset === 'personalizado' ? intervalo('mes') : intervalo(preset)));
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const empresaId = empresa?.id;
  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    setErro(null);
    dashboardApi
      .get(empresaId, datas.de || undefined, datas.ate || undefined)
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Erro ao carregar'));
    return () => {
      ativo = false;
    };
  }, [empresaId, datas.de, datas.ate]);

  if (!empresa) return <p className="text-slate-600">Crie ou ative uma empresa em Definições.</p>;

  return (
    <div className="space-y-6">
      <PeriodoSelector
        preset={preset}
        de={datas.de}
        ate={datas.ate}
        onPreset={(p) => {
          setPreset(p);
          writeStorage('dashboardPeriodo', p);
          if (p !== 'personalizado') setDatas(intervalo(p));
        }}
        onDatas={(de, ate) => setDatas({ de, ate })}
      />
      <ErrorText>{erro}</ErrorText>
      {!dados ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <>
          <SaldosResumo saldos={dados.saldos} />
          <EntradasSaidas porMoeda={dados.porMoeda} />
          <Estimativa e={dados.estimativaAOA} />
          <TopLista titulo="Top categorias" linhas={dados.porCategoria} />
          <TopLista titulo="Top destinos" linhas={dados.porDestino} />
          <p className="text-xs text-slate-500">Transferências e câmbios entre carteiras não contam como entradas ou saídas.</p>
        </>
      )}
    </div>
  );
}
