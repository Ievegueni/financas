import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CarteirasSection } from '../components/definicoes/Carteiras';
import { CategoriasSection } from '../components/definicoes/Categorias';
import { DestinosSection } from '../components/definicoes/Destinos';
import { EmpresasSection } from '../components/definicoes/Empresas';
import { TaxasSection } from '../components/definicoes/Taxas';
import { useEmpresa } from '../lib/empresa';

const TABS = {
  carteiras: 'Carteiras',
  categorias: 'Categorias',
  destinos: 'Destinos',
  empresas: 'Empresas',
  taxa: 'Taxa USDT→AOA',
} as const;
type Tab = keyof typeof TABS;

export function DefinicoesPage() {
  const [params] = useSearchParams();
  const inicial = params.get('tab');
  const [tab, setTab] = useState<Tab>(inicial && inicial in TABS ? (inicial as Tab) : 'carteiras');
  const { empresa } = useEmpresa();
  const precisaEmpresa = tab !== 'empresas' && tab !== 'taxa';

  return (
    <div className="space-y-4">
      <div role="tablist" className="-mx-4 flex gap-1 overflow-x-auto px-4">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === t ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            {TABS[t]}
          </button>
        ))}
      </div>

      {precisaEmpresa && empresa && (
        <p className="text-sm text-slate-500">
          Empresa: <strong className="text-slate-800">{empresa.nome}</strong>
        </p>
      )}

      {tab === 'empresas' && <EmpresasSection />}
      {tab === 'taxa' && <TaxasSection />}
      {precisaEmpresa && !empresa && (
        <p className="text-sm text-slate-500">Crie ou ative uma empresa no separador Empresas.</p>
      )}
      {empresa && tab === 'carteiras' && <CarteirasSection key={empresa.id} empresaId={empresa.id} />}
      {empresa && tab === 'categorias' && <CategoriasSection key={empresa.id} empresaId={empresa.id} />}
      {empresa && tab === 'destinos' && <DestinosSection key={empresa.id} empresaId={empresa.id} />}
    </div>
  );
}
