/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Páginas Públicas
import Index from './pages/Index'
import Cadastro from './pages/Cadastro'
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import VerificarEmail from './pages/VerificarEmail'
import ConfirmarEmail from './pages/ConfirmarEmail'
import NotFound from './pages/NotFound'

// Páginas do Gerente
import Dashboard from './pages/Dashboard'
import Processos from './pages/Processos'
import ProcessoDetalhe from './pages/ProcessoDetalhe'
import Escala from './pages/Escala'
import Relatorios from './pages/Relatorios'
import Equipe from './pages/Equipe'

// Páginas do Colaborador
import Hoje from './pages/Hoje'
import Historico from './pages/Historico'
import Perfil from './pages/Perfil'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/confirmar-email" element={<ConfirmarEmail />} />

          {/* Rotas Protegidas do Gerente */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['gerente']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/processos"
            element={
              <ProtectedRoute allowedRoles={['gerente']}>
                <Processos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/processos/:id"
            element={
              <ProtectedRoute allowedRoles={['gerente']}>
                <ProcessoDetalhe />
              </ProtectedRoute>
            }
          />
          <Route
            path="/escala"
            element={
              <ProtectedRoute allowedRoles={['gerente']}>
                <Escala />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute allowedRoles={['gerente']}>
                <Relatorios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipe"
            element={
              <ProtectedRoute allowedRoles={['gerente']}>
                <Equipe />
              </ProtectedRoute>
            }
          />

          {/* Rotas do Colaborador (e Gerente também pode ver) */}
          <Route
            path="/hoje"
            element={
              <ProtectedRoute>
                <Hoje />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historico"
            element={
              <ProtectedRoute>
                <Historico />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
