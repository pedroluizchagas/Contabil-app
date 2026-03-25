import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { EmpresasPage } from '@/pages/empresas/EmpresasPage'
import { EmpresaFormPage } from '@/pages/empresas/EmpresaFormPage'
import { FuncionariosPage } from '@/pages/funcionarios/FuncionariosPage'
import { FuncionarioFormPage } from '@/pages/funcionarios/FuncionarioFormPage'
import { LotesPage } from '@/pages/lotes/LotesPage'
import { LoteDetalhesPage } from '@/pages/lotes/LoteDetalhesPage'
import { UploadLotePage } from '@/pages/lotes/UploadLotePage'
import { DocumentosPage } from '@/pages/documentos/DocumentosPage'
import { ConfiguracoesPage } from '@/pages/configuracoes/ConfiguracoesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="empresas" element={<EmpresasPage />} />
            <Route path="empresas/nova" element={<EmpresaFormPage />} />
            <Route path="empresas/:empresaId" element={<EmpresaFormPage />} />
            <Route path="empresas/:empresaId/funcionarios" element={<FuncionariosPage />} />
            <Route path="empresas/:empresaId/funcionarios/novo" element={<FuncionarioFormPage />} />
            <Route path="empresas/:empresaId/funcionarios/:funcId" element={<FuncionarioFormPage />} />
            <Route path="lotes" element={<LotesPage />} />
            <Route path="lotes/upload" element={<UploadLotePage />} />
            <Route path="lotes/:loteId" element={<LoteDetalhesPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
