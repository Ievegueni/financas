import { useState } from 'react';
import { Button, ErrorText, Input } from '../ui';

const NOVO = '__novo__';

interface Props {
  label: string;
  novoLabel: string;
  value: string | null;
  onChange: (id: string | null) => void;
  options: { id: string; nome: string }[];
  onCriar: (nome: string) => Promise<{ id: string }>;
}

// Select com opção "Criar novo…" que abre um campo inline, sem sair do formulário.
export function SelectComNovo({ label, novoLabel, value, onChange, options, onCriar }: Props) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  async function criar() {
    if (!nome.trim()) return;
    setAGuardar(true);
    setErro(null);
    try {
      const novo = await onCriar(nome.trim());
      onChange(novo.id);
      setCriando(false);
      setNome('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {criando ? (
        <div className="space-y-1">
          <div className="flex gap-2">
            <Input
              aria-label={novoLabel}
              placeholder={novoLabel}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void criar();
                }
              }}
              autoFocus
            />
            <Button onClick={criar} disabled={aGuardar || !nome.trim()}>
              Criar
            </Button>
            <Button variant="secondary" onClick={() => (setCriando(false), setErro(null))}>
              ✕
            </Button>
          </div>
          <ErrorText>{erro}</ErrorText>
        </div>
      ) : (
        <select
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => {
            if (e.target.value === NOVO) setCriando(true);
            else onChange(e.target.value || null);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none"
        >
          <option value="">— nenhuma —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
          <option value={NOVO}>+ {novoLabel}…</option>
        </select>
      )}
    </div>
  );
}
