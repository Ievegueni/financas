import type { Moeda } from '../lib/money';
import { api } from './client';

export type TipoCarteira = 'BANCO' | 'WALLET_BINANCE' | 'OUTRO';
export type TipoCategoria = 'ENTRADA' | 'SAIDA' | 'AMBOS';
export type TipoDestino = 'PESSOA' | 'FORNECEDOR' | 'CLIENTE' | 'CARTEIRA_EXTERNA' | 'OUTRO';

export interface Empresa {
  id: string;
  nome: string;
  nif: string | null;
  ativa: boolean;
}

export interface Carteira {
  id: string;
  empresaId: string;
  nome: string;
  tipo: TipoCarteira;
  moeda: Moeda;
  saldoInicial: string;
  ativa: boolean;
}

export interface Categoria {
  id: string;
  empresaId: string;
  nome: string;
  tipo: TipoCategoria;
  ativa: boolean;
}

export interface Destino {
  id: string;
  empresaId: string;
  nome: string;
  tipo: TipoDestino;
  ativo: boolean;
}

export const TIPO_CARTEIRA: Record<TipoCarteira, string> = {
  BANCO: 'Banco',
  WALLET_BINANCE: 'Wallet Binance',
  OUTRO: 'Outro',
};
export const TIPO_CATEGORIA: Record<TipoCategoria, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AMBOS: 'Entrada e saída',
};
export const TIPO_DESTINO: Record<TipoDestino, string> = {
  PESSOA: 'Pessoa',
  FORNECEDOR: 'Fornecedor',
  CLIENTE: 'Cliente',
  CARTEIRA_EXTERNA: 'Carteira externa',
  OUTRO: 'Outro',
};

function crud<T, C, U>(base: string) {
  return {
    list: (empresaId?: string) =>
      api<T[]>(empresaId ? `${base}?empresaId=${encodeURIComponent(empresaId)}` : base),
    create: (data: C) => api<T>(base, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: U) => api<T>(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => api<null>(`${base}/${id}`, { method: 'DELETE' }),
  };
}

type Editavel<T, Omit_ extends keyof T> = Omit<T, 'id' | Omit_>;

export const empresasApi = crud<Empresa, Editavel<Empresa, 'ativa'>, Partial<Editavel<Empresa, never>>>(
  '/empresas',
);
export const carteirasApi = crud<
  Carteira,
  Editavel<Carteira, 'ativa'>,
  Partial<Editavel<Carteira, 'empresaId'>>
>('/carteiras');
export const categoriasApi = crud<
  Categoria,
  Editavel<Categoria, 'ativa'>,
  Partial<Editavel<Categoria, 'empresaId'>>
>('/categorias');
export const destinosApi = crud<Destino, Editavel<Destino, 'ativo'>, Partial<Editavel<Destino, 'empresaId'>>>(
  '/destinos',
);
