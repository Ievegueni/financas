import { api } from './client';
import type { Movimento } from './movimentos';

export interface TransferenciaInput {
  origemCarteiraId: string;
  destinoCarteiraId: string;
  valorEnviado: string;
  valorRecebido: string | null;
  taxaCambio: string | null;
  data: string;
  descricao: string | null;
}

export const transferenciasApi = {
  create: (data: TransferenciaInput) =>
    api<{ transferenciaId: string; saida: Movimento; entrada: Movimento }>('/transferencias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
