import { useState } from 'react';
import type { Movimento } from '../../api/movimentos';
import { formatData } from '../../lib/date';
import { formatValor } from '../../lib/money';
import { Button, ErrorText } from '../ui';

interface Props {
  movimento: Movimento;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

// Pernas de transferência não se editam: elimina-se a transferência (as 2 pernas) e regista-se de novo.
export function TransferenciaInfo({ movimento: m, onDelete, onCancel }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState(false);

  async function eliminar() {
    if (!confirm('Eliminar a transferência? As duas pernas (saída e entrada) serão eliminadas.')) return;
    setAEliminar(true);
    try {
      await onDelete();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao eliminar');
      setAEliminar(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{m.taxaCambio ? 'Câmbio' : 'Transferência'}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Perna</dt>
        <dd>{m.tipo === 'SAIDA' ? 'Saída' : 'Entrada'} em {m.carteira.nome}</dd>
        <dt className="text-slate-500">Valor</dt>
        <dd className="tabular-nums">{formatValor(m.valor, m.moeda)}</dd>
        {m.taxaCambio && (
          <>
            <dt className="text-slate-500">Taxa</dt>
            <dd className="tabular-nums">1 USDT = {formatValor(m.taxaCambio, 'AOA')}</dd>
          </>
        )}
        <dt className="text-slate-500">Data</dt>
        <dd>{formatData(m.data)}</dd>
        {m.descricao && (
          <>
            <dt className="text-slate-500">Nota</dt>
            <dd>{m.descricao}</dd>
          </>
        )}
      </dl>
      <p className="text-xs text-slate-500">Para corrigir, elimine a transferência e registe-a de novo.</p>
      <ErrorText>{erro}</ErrorText>
      <div className="flex gap-2">
        <Button variant="danger" onClick={eliminar} disabled={aEliminar}>
          Eliminar transferência
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
