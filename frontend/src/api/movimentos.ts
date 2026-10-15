import type { Moeda } from '../lib/money';
import { api } from './client';

export type TipoMovimento = 'ENTRADA' | 'SAIDA';

interface Ref {
  id: string;
  nome: string;
}

export interface Movimento {
  id: string;
  empresaId: string;
  carteiraId: string;
  tipo: TipoMovimento;
  valor: string;
  moeda: Moeda;
  taxaCambio: string | null;
  categoriaId: string | null;
  destinoId: string | null;
  data: string; // ISO, meia-noite UTC
  descricao: string | null;
  transferenciaId: string | null;
  carteira: Ref;
  categoria: Ref | null;
  destino: Ref | null;
}

export interface MovimentoInput {
  carteiraId: string;
  tipo: TipoMovimento;
  valor: string;
  categoriaId: string | null;
  destinoId: string | null;
  data: string; // aaaa-mm-dd
  descricao: string | null;
}

export interface Saldos {
  carteiras: {
    id: string;
    nome: string;
    moeda: Moeda;
    ativa: boolean;
    saldoInicial: string;
    entradas: string;
    saidas: string;
    saldo: string;
  }[];
  porMoeda: { moeda: Moeda; saldo: string }[];
}

export const movimentosApi = {
  recentes: (empresaId: string, limit = 20) =>
    api<Movimento[]>(`/movimentos?empresaId=${encodeURIComponent(empresaId)}&limit=${limit}`),
  create: (empresaId: string, data: MovimentoInput) =>
    api<Movimento>('/movimentos', { method: 'POST', body: JSON.stringify({ ...data, empresaId }) }),
  update: (id: string, data: Partial<MovimentoInput>) =>
    api<Movimento>(`/movimentos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<null>(`/movimentos/${id}`, { method: 'DELETE' }),
};

export const saldosApi = {
  get: (empresaId: string) => api<Saldos>(`/saldos?empresaId=${encodeURIComponent(empresaId)}`),
};
