import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { LOCAIS, LOCAL_LABELS, type LocalValue } from '@/lib/locais'

export default function Cadastro() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [local, setLocal] = useState<LocalValue | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password !== passwordConfirm) {
      setErrorMessage('A senha e a confirmação não conferem.')
      return
    }
    if (password.length < 8) {
      setErrorMessage('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setIsSubmitting(true)
    try {
      await pb.collection('users').create({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm,
        role: 'colaborador',
        local: local || '',
      })

      // Disparar e-mail de verificação
      try {
        await pb.collection('users').requestVerification(email.trim())
      } catch {
        /* intentionally ignored */
      }

      setSuccess(true)
      toast.success('Conta criada com sucesso! Verifique seu e-mail.')
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'Erro ao criar conta. Verifique os dados e tente novamente.'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-6 text-[#3B2B2B]">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md border border-[#F2A65A]/20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#3FA372]/15 text-[#3FA372] mx-auto flex items-center justify-center text-3xl mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">
            Verifique seu e-mail! 🧁
          </h2>
          <p className="text-sm text-[#8A6F6F] mt-3 leading-relaxed">
            Enviamos um link de confirmação para <strong>{email}</strong>. Por favor, acesse seu
            e-mail para ativar sua conta e entrar no Tati Check.
          </p>
          <div className="mt-8">
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold"
            >
              Voltar para o Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col justify-center items-center p-6 text-[#3B2B2B]">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(59,43,43,0.06)] border border-[#F2A65A]/20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A6F6F] hover:text-[#E0447C] mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E0447C] to-[#F2A65A] flex items-center justify-center text-white text-xl">
            🧁
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-[#3B2B2B]">Criar nova conta</h1>
            <p className="text-xs text-[#8A6F6F]">Perfil inicial de Colaborador</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/30 text-[#E5484D] text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
            >
              Nome completo
            </Label>
            <Input
              id="name"
              type="text"
              required
              placeholder="Ex.: Maria Souza"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
            />
          </div>

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
              placeholder="seu.email@tatidoces.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="local"
              className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
            >
              Local de operação
            </Label>
            <Select value={local} onValueChange={(val) => setLocal(val as LocalValue)}>
              <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]">
                <SelectValue placeholder="Selecione o local (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {LOCAIS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LOCAL_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[#8A6F6F]">
              Usado para filtrar as tarefas da sua unidade. Pode ser alterado depois pelo gerente.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
            >
              Senha
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
              Confirme sua senha
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              required
              placeholder="Repita a senha"
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
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#8A6F6F]">
          Já possui acesso?{' '}
          <Link to="/" className="font-bold text-[#E0447C] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
