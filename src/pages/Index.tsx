import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InstallAppButton } from '@/components/InstallAppButton'
import { PinLogin } from '@/components/PinLogin'
import { LogoTati } from '@/components/LogoTati'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2, Fingerprint, Mail } from 'lucide-react'

type AbaLogin = 'email' | 'pin'

export default function Index() {
  const { isAuthenticated, user, login, isLoading } = useAuth()
  const navigate = useNavigate()

  const [aba, setAba] = useState<AbaLogin>('email')
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
        <div className="absolute top-10 right-12 w-20 h-20 rounded-full bg-[#E0447C]/10 blur-xl pointer-events-none"></div>
        <div className="absolute bottom-16 left-10 w-32 h-32 rounded-full bg-[#F2A65A]/15 blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-4">
            <LogoTati variant="completo" className="h-24 w-auto" />
          </div>
          <div className="mt-3">
            <h1 className="text-3xl font-display font-extrabold tracking-tight text-[#E0447C]">
              Tati Check
            </h1>
            <p className="text-xs uppercase tracking-widest font-semibold text-[#8A6F6F]">
              Checklist e Rotina Operacional
            </p>
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
          <LogoTati variant="completo" className="h-28 w-auto" />
          <h1 className="text-2xl font-display font-extrabold text-[#E0447C] mt-3">Tati Check</h1>
          <p className="text-sm text-[#8A6F6F] mt-1">Checklist e Rotina Operacional</p>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(59,43,43,0.06)] border border-[#F2A65A]/20">
          {/* Abas: e-mail (gerente) / PIN (colaborador) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-[#FFF9F2] border border-[#F2A65A]/20 mb-6">
            <button
              type="button"
              onClick={() => {
                setAba('email')
                setErrorMessage(null)
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer',
                aba === 'email'
                  ? 'bg-[#E0447C] text-white shadow-sm'
                  : 'text-[#8A6F6F] hover:text-[#3B2B2B]',
              )}
            >
              <Mail className="w-3.5 h-3.5" /> Gerente
            </button>
            <button
              type="button"
              onClick={() => {
                setAba('pin')
                setErrorMessage(null)
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer',
                aba === 'pin'
                  ? 'bg-[#E0447C] text-white shadow-sm'
                  : 'text-[#8A6F6F] hover:text-[#3B2B2B]',
              )}
            >
              <Fingerprint className="w-3.5 h-3.5" /> Sou colaborador
            </button>
          </div>

          {aba === 'email' ? (
            <>
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

              <div className="mt-6 text-center text-sm text-[#8A6F6F]">
                Contas de colaboradores são criadas pelo gerente na tela{' '}
                <span className="font-semibold text-[#3B2B2B]">Equipe</span>.
              </div>
            </>
          ) : (
            <PinLogin
              onVoltar={() => setAba('email')}
              onSucesso={(nome) => {
                toast.success(`Bem-vindo(a), ${nome}! 🧁`)
                navigate('/hoje')
              }}
            />
          )}
        </div>

        {/* Instalação PWA — fora do card, discreto, no rodapé da coluna */}
        <div className="mt-6 w-full max-w-[420px] flex justify-center">
          <div className="w-full max-w-[300px]">
            <InstallAppButton />
          </div>
        </div>
      </div>
    </div>
  )
}
