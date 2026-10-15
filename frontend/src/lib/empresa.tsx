import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { empresasApi, type Empresa } from '../api/cadastros';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'empresaId';

interface EmpresaState {
  empresas: Empresa[];
  empresa: Empresa | null; // empresa selecionada (só ativas)
  selecionar: (id: string) => void;
  recarregar: () => Promise<void>;
  loading: boolean;
}

const EmpresaContext = createContext<EmpresaState | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(() => readStorage(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setEmpresas(await empresasApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const selecionar = useCallback((id: string) => {
    setSelecionadaId(id);
    writeStorage(STORAGE_KEY, id);
  }, []);

  // Se a escolhida deixou de existir ou foi desativada, usa a primeira ativa.
  const ativas = empresas.filter((e) => e.ativa);
  const empresa = ativas.find((e) => e.id === selecionadaId) ?? ativas[0] ?? null;

  const value = useMemo(
    () => ({ empresas, empresa, selecionar, recarregar, loading }),
    [empresas, empresa, selecionar, recarregar, loading],
  );
  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa(): EmpresaState {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa fora de EmpresaProvider');
  return ctx;
}
