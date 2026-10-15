import { useAuth } from '../lib/auth';

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Olá, {user?.nome}</h1>
        <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Sair
        </button>
      </header>
      <p className="mt-6 text-slate-600">Sessão iniciada. Os ecrãs chegam nos próximos sprints.</p>
    </main>
  );
}
