import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useEmpresa } from '../lib/empresa';

const links = [
  { to: '/', label: 'Registar' },
  { to: '/definicoes', label: 'Definições' },
];

export function Layout() {
  const { logout } = useAuth();
  const { empresas, empresa, selecionar } = useEmpresa();
  const ativas = empresas.filter((e) => e.ativa);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
          {ativas.length > 0 ? (
            <select
              aria-label="Empresa"
              value={empresa?.id ?? ''}
              onChange={(e) => selecionar(e.target.value)}
              className="min-w-0 flex-1 truncate rounded-lg border border-slate-300 bg-white px-2 py-2 text-base font-semibold"
            >
              {ativas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          ) : (
            <span className="flex-1 text-sm text-slate-500">Sem empresas ativas</span>
          )}
          <button onClick={logout} className="shrink-0 rounded-lg px-2 py-2 text-sm text-slate-600">
            Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
