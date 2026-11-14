import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Sparkles, ArrowRight, ShieldCheck, HeartHandshake, CheckCircle2 } from 'lucide-react'

export default function Index() {
  const { isAuthenticated, user, login, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirecionamento se já logado
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'gerente') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/hoje', { replace: true })
      }
    }
  }, [isAuthenticated, user, isLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.')
      return
    }

    setIsSubmitting(true)
    try {
      const loggedUser = await login(email.trim(), password)
      toast.success(`Bem-vindo(a), ${loggedUser.name || 'ao Tati Check'}! 🧁`)
      if (loggedUser.role === 'gerente') {
        navigate('/dashboard')
      } else {
        navigate('/hoje')
      }
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'E-mail ou senha inválidos. Verifique e tente novamente.'
      setErrorMessage(msg)
      toast.error('Não foi possível entrar. Verifique suas credenciais.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickLogin = (role: 'gerente' | 'colaborador') => {
    if (role === 'gerente') {
      setEmail('juniordias_rj@hotmail.com')
      setPassword('Skip@Pass')
    } else {
      setEmail('maria@tatidoces.com.br')
      setPassword('Skip@Pass')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF9F2]">
        <div className="w-10 h-10 border-4 border-[#E0447C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col lg:flex-row text-[#3B2B2B]">
      {/* Coluna Esquerda: Identidade da Marca (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFF3E8] via-[#FDF0F5] to-[#FFF9F2] p-12 flex-col justify-between border-r border-[#F2A65A]/20 relative overflow-hidden">
        {/* Confeitos decorativos flutuantes */}
        <div className="absolute top-10 right-12 w-20 h-20 rounded-full bg-[#E0447C]/10 blur-xl pointer-events-none"></div>
        <div className="absolute bottom-16 left-10 w-32 h-32 rounded-full bg-[#F2A65A]/15 blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E0447C] to-[#F2A65A] flex items-center justify-center text-white shadow-md text-2xl font-bold font-display">
              🧁
            </div>
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight text-[#E0447C]">
                Tati Check
              </h1>
              <p className="text-xs uppercase tracking-widest font-semibold text-[#8A6F6F]">
                Tati Doces Confeitaria
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-md">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0447C]/10 text-[#E0447C] text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" /> Checklist e Rotina Operacional
            </span>
            <h2 className="text-4xl xl:text-5xl font-display font-bold text-[#3B2B2B] leading-tight">
              Checklist com a cara da <span className="text-[#E0447C]">Tati Doces</span>.
            </h2>
            <p className="mt-4 text-base text-[#8A6F6F] leading-relaxed">
              Feito sob medida para quem preza pelo capricho, pontualidade e padrão artesanal.
              Simples de usar na cozinha, no balcão e no caixa.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-sm text-[#3B2B2B] font-medium">
                <CheckCircle2 className="w-5 h-5 text-[#3FA372] shrink-0" />
                <span>Acompanhamento em tempo real para gerentes</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#3B2B2B] font-medium">
                <CheckCircle2 className="w-5 h-5 text-[#3FA372] shrink-0" />
                <span>App mobile-first rápido para colaboradores</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#3B2B2B] font-medium">
                <CheckCircle2 className="w-5 h-5 text-[#3FA372] shrink-0" />
                <span>Evidências com fotos e observações práticas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#3B2B2B]/10 flex items-center justify-between text-xs text-[#8A6F6F]">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#F2A65A]" /> Ambiente Seguro e Sincronizado
          </span>
          <span className="font-semibold text-[#E0447C]">Qualidade Artesanal</span>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Login */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        {/* Topo Mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E0447C] to-[#F2A65A] flex items-center justify-center text-white shadow-md text-3xl font-bold font-display mb-3">
            🧁
          </div>
          <h1 className="text-3xl font-display font-extrabold text-[#E0447C]">Tati Check</h1>
          <p className="text-sm text-[#8A6F6F] mt-1">Confeitaria Tati Doces</p>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(59,43,43,0.06)] border border-[#F2A65A]/20">
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">Acesse sua conta</h2>
            <p className="text-sm text-[#8A6F6F] mt-1">
              Informe seu e-mail e senha para começar o dia
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/30 text-[#E5484D] text-sm font-medium flex items-center gap-2">
              <span className="font-bold">Aviso:</span> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu.email@tatidoces.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-base"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Senha
                </Label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs font-semibold text-[#E0447C] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-base shadow-md transition-all mt-2 cursor-pointer"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar no Tati Check'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Atalhos Rápidos para Demonstração */}
          <div className="mt-6 pt-6 border-t border-[#3B2B2B]/10">
            <p className="text-xs text-center text-[#8A6F6F] font-semibold mb-3 uppercase tracking-wider">
              Acesso rápido para demonstração:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('gerente')}
                className="text-xs py-2 px-3 rounded-xl border border-[#E0447C]/40 bg-[#FFF3E8] hover:bg-[#FFE8D6] text-[#3B2B2B] font-semibold transition text-center cursor-pointer"
              >
                👔 Gerente (Junior)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('colaborador')}
                className="text-xs py-2 px-3 rounded-xl border border-[#F2A65A]/40 bg-[#FFF9F2] hover:bg-[#FFF0E0] text-[#3B2B2B] font-semibold transition text-center cursor-pointer"
              >
                👩‍🍳 Colaboradora (Maria)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-[#8A6F6F]">
            Não tem uma conta ainda?{' '}
            <Link to="/cadastro" className="font-bold text-[#E0447C] hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
