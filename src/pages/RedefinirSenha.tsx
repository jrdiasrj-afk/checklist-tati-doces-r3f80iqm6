import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!token) {
      setErrorMessage('Token de redefinição não encontrado ou link expirado.')
      return
    }
    if (password !== passwordConfirm) {
      setErrorMessage('A nova senha e a confirmação não conferem.')
      return
    }
    if (password.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    setIsSubmitting(true)
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      setSuccess(true)
      toast.success('Senha alterada com sucesso!')
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'Link inválido ou expirado. Tente solicitar novamente.'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-6 text-[#3B2B2B]">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md border border-[#F2A65A]/20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#E5484D]/15 text-[#E5484D] mx-auto flex items-center justify-center text-3xl mb-4">
            <AlertCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">Link Inválido</h2>
          <p className="text-sm text-[#8A6F6F] mt-2">
            Este link de redefinição de senha não contém um token válido ou já expirou.
          </p>
          <div className="mt-6">
            <Link to="/esqueci-senha">
              <Button className="w-full h-11 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold">
                Solicitar novo link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-6 text-[#3B2B2B]">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md border border-[#F2A65A]/20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#3FA372]/15 text-[#3FA372] mx-auto flex items-center justify-center text-3xl mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">Senha Atualizada!</h2>
          <p className="text-sm text-[#8A6F6F] mt-2">
            Sua nova senha foi gravada com sucesso. Você já pode fazer login no Tati Check.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => navigate('/')}
              className="w-full h-11 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold"
            >
              Ir para o Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col justify-center items-center p-6 text-[#3B2B2B]">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(59,43,43,0.06)] border border-[#F2A65A]/20">
        <h1 className="text-2xl font-display font-bold text-[#3B2B2B] mb-2">Definir Nova Senha</h1>
        <p className="text-sm text-[#8A6F6F] mb-6">
          Digite sua nova senha abaixo para recuperar o acesso.
        </p>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/30 text-[#E5484D] text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
            >
              Nova Senha
            </Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="passwordConfirm"
              className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
            >
              Confirme a Nova Senha
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              required
              placeholder="Repita a nova senha"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-base shadow-md transition-all mt-4"
          >
            {isSubmitting ? 'Salvando...' : 'Atualizar Minha Senha'}
          </Button>
        </form>
      </div>
    </div>
  )
}
