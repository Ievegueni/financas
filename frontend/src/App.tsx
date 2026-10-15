import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { EmpresaProvider } from './lib/empresa';
import { DashboardPage } from './pages/Dashboard';
import { DefinicoesPage } from './pages/Definicoes';
import { HistoricoPage } from './pages/Historico';
import { LoginPage } from './pages/Login';
import { RegistoPage } from './pages/Registo';
import { TransferenciaPage } from './pages/Transferencia';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <EmpresaProvider>
                  <Layout />
                </EmpresaProvider>
              }
            >
              <Route path="/" element={<RegistoPage />} />
              <Route path="/transferencia" element={<TransferenciaPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/historico" element={<HistoricoPage />} />
              <Route path="/definicoes" element={<DefinicoesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
