import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { EmpresaProvider } from './lib/empresa';
import { DefinicoesPage } from './pages/Definicoes';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';

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
              <Route path="/" element={<HomePage />} />
              <Route path="/definicoes" element={<DefinicoesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
