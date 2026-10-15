import { useAuth } from '../lib/auth';
import { useEmpresa } from '../lib/empresa';

export function HomePage() {
  const { user } = useAuth();
  const { empresa } = useEmpresa();

  return (
    <section className="space-y-2">
      <h1 className="text-lg font-semibold">Olá, {user?.nome}</h1>
      <p className="text-slate-600">
        {empresa ? `Empresa: ${empresa.nome}.` : 'Crie uma empresa em Definições.'} O registo de movimentos chega
        no próximo sprint.
      </p>
    </section>
  );
}
