import { useCallback, useEffect, useState } from 'react';

// Carrega a lista de cadastros de uma empresa e permite recarregar.
export function useLista<T>(empresaId: string | undefined, load: (empresaId: string) => Promise<T[]>) {
  const [itens, setItens] = useState<T[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!empresaId) return;
    try {
      setErro(null);
      setItens(await load(empresaId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, [empresaId, load]);

  useEffect(() => {
    setItens(null);
    void recarregar();
  }, [recarregar]);

  return { itens, erro, recarregar };
}
