import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  BarChart3,
  Users,
  LogOut,
  CheckSquare,
  History,
  User,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usersService } from '@/services/users'
import { LogoTati } from '@/components/LogoTati'

export const MainLayout: React.FC<{
  children: React.ReactNode
  title?: string
  actions?: React.ReactNode
}> = ({ children, title, actions }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isGerente = user?.role === 'gerente'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const getInitials = (name?: string) => {
    if (!name) return 'TC'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const userAvatarUrl = user?.avatar ? usersService.getFileUrl(user, user.avatar) : ''

  // Rotas do Gerente
  const gerenteNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Processos', path: '/processos', icon: FolderKanban },
    { label: 'Escala', path: '/escala', icon: CalendarDays },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { label: 'Equipe', path: '/equipe', icon: Users },
  ]

  // Rotas do Colaborador
  const colaboradorNav = [
    { label: 'Hoje', path: '/hoje', icon: CheckSquare },
    { label: 'Histórico', path: '/historico', icon: History },
    { label: 'Perfil', path: '/perfil', icon: User },
  ]

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#3B2B2B] flex flex-col">
      {/* ================= DESKTOP (≥1025px): SIDEBAR FIXA (GERENTE) ================= */}
      {isGerente && (
        <aside className="hidden lg:flex flex-col w-[210px] fixed inset-y-0 left-0 bg-white border-r border-[#F2A65A]/20 z-30 shadow-[2px_0_12px_rgba(59,43,43,0.03)]">
          {/* Logo Header */}
          <div className="p-5 flex flex-col items-start gap-3 border-b border-[#F2A65A]/15">
            <LogoTati variant="wordmark" className="h-11 w-auto" />
            <span className="text-[10px] font-bold text-[#8A6F6F] tracking-wider uppercase">
              Painel Gerencial · Tati Check
            </span>
          </div>

          {/* Navegação */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {gerenteNav.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#E0447C] text-white shadow-sm'
                      : 'text-[#3B2B2B] hover:bg-[#FFF3E8] hover:text-[#E0447C]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#8A6F6F]'}`} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Rodapé do Gerente */}
          <div className="p-3 border-t border-[#F2A65A]/15 bg-[#FFF9F2]/60">
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-9 h-9 border border-[#E0447C]/30">
                  <AvatarImage src={userAvatarUrl} />
                  <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-xs">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate text-[#3B2B2B]">
                    {user?.name || 'Gerente'}
                  </p>
                  <p className="text-[10px] text-[#8A6F6F] truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sair da conta"
                className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E5484D] hover:bg-white transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ================= HEADER DO COLABORADOR (MOBILE-FIRST) ================= */}
      {!isGerente && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#F2A65A]/20 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-10 h-10 border-2 border-[#E0447C]/30 shadow-xs">
                <AvatarImage src={userAvatarUrl} />
                <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-xs">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-[#8A6F6F] font-medium leading-none">
                  Olá, {user?.name ? user.name.split(' ')[0] : 'Colaborador'} ☕
                </p>
                <LogoTati variant="wordmark" className="h-4 w-auto mt-0.5" />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-[#8A6F6F] bg-[#FFF3E8] px-2.5 py-1 rounded-full border border-[#F2A65A]/30">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </header>
      )}

      {/* ================= ÁREA DE CONTEÚDO PRINCIPAL ================= */}
      <main
        className={`flex-1 flex flex-col transition-all ${
          isGerente ? 'lg:pl-[210px] pb-20 lg:pb-8' : 'pb-20'
        }`}
      >
        {/* Cabeçalho da Página do Gerente (quando houver título) */}
        {isGerente && title && (
          <div className="px-4 sm:px-8 pt-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#3B2B2B] tracking-tight">
                {title}
              </h1>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        <div className="flex-1 px-4 sm:px-8 py-4">{children}</div>
      </main>

      {/* ================= BARRA INFERIOR FIXA (≤1024px PARA GERENTE, E SEMPRE PARA COLABORADOR) ================= */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#F2A65A]/25 px-2 py-1.5 shadow-[0_-4px_16px_rgba(59,43,43,0.06)] ${isGerente ? 'lg:hidden' : ''}`}
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {isGerente
            ? gerenteNav.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] rounded-xl transition ${
                      isActive ? 'text-[#E0447C] font-bold' : 'text-[#8A6F6F] hover:text-[#3B2B2B]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                    <span className="text-[10px] mt-0.5">{item.label}</span>
                  </NavLink>
                )
              })
            : colaboradorNav.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center justify-center py-1 px-4 min-w-[64px] min-h-[48px] rounded-xl transition ${
                      isActive ? 'text-[#E0447C] font-bold' : 'text-[#8A6F6F] hover:text-[#3B2B2B]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                    <span className="text-[11px] mt-0.5">{item.label}</span>
                  </NavLink>
                )
              })}
        </div>
      </nav>
    </div>
  )
}
