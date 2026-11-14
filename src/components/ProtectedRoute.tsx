import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('gerente' | 'colaborador')[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9F2]">
        <div className="w-12 h-12 border-4 border-[#E0447C] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#3B2B2B] font-display font-medium text-lg">Carregando Tati Check...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Se colaborador tentar acessar rota de gerente, redireciona para /hoje
    if (user.role === 'colaborador') {
      return <Navigate to="/hoje" replace />
    }
    // Se gerente tentar acessar algo restrito a colaborador, vai para dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
