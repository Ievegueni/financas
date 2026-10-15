import { Button } from '../ui';

export function FormActions({ onCancel, submitting }: { onCancel: () => void; submitting: boolean }) {
  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? 'A guardar…' : 'Guardar'}
      </Button>
      <Button variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}
