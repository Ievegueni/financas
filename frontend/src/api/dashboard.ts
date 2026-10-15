import type { Moeda } from '../lib/money';
import { api } from './client';
import type { Saldos, TipoMovimento } from './movimentos';

export interface Agrupado {
  id: string | null;
  nome: string;
  tipo: TipoMovimento;
  moeda: Moeda;
  total: string;
  count: number;
}

export interface Dashboard {
  periodo: { de: string | null; ate: string | null };
  saldos: Saldos;
  porMoeda: { moeda: Moeda; entradas: string; saidas: string; liquido: string }[];
  porCategoria: Agrupado[];
  porDestino: Agrupado[];
  estimativaAOA: {
    taxa: { valor: string; data: string } | null;
    saldo: string | null;
    entradas: string | null;
    saidas: string | null;
  };
}

export interface Taxa {
  id: string;
  data: string;
  valor: string;
}

export const dashboardApi = {
  get: (empresaId: string, de?: string, ate?: string) => {
    const p = new URLSearchParams({ empresaId });
    if (de) p.set('de', de);
    if (ate) p.set('ate', ate);
    return api<Dashboard>(`/dashboard?${p}`);
  },
};

export const taxasApi = {
  list: () => api<Taxa[]>('/taxas'),
  create: (valor: string, data?: string) =>
    api<Taxa>('/taxas', { method: 'POST', body: JSON.stringify({ valor, data }) }),
};
