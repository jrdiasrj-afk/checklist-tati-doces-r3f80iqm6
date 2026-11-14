import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, MailCheck } from 'lucide-react'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setSent(true)
      toast.success('Instruções enviadas para seu e-mail!')
    } catch (err: any) {
      // Por segurança, mostramos sucesso mesmo se o email não existir
      setSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col justify-center items-center p-6 text-[#3B2B2B]">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(59,43,43,0.06)] border border-[#F2A65A]/20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A6F6F] hover:text-[#E0447C] mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#3FA372]/15 text-[#3FA372] mx-auto flex items-center justify-center text-3xl mb-4">
              <MailCheck className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">E-mail enviado!</h2>
            <p className="text-sm text-[#8A6F6F] mt-2 leading-relaxed">
              Se houver uma conta associada a <strong>{email}</strong>, você receberá um link seguro
              para redefinir sua senha.
            </p>
            <div className="mt-8">
              <Link to="/">
                <Button className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold">
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-display font-bold text-[#3B2B2B] mb-2">Recuperar Senha</h1>
            <p className="text-sm text-[#8A6F6F] mb-6">
              Digite seu e-mail cadastrado e enviaremos instruções para criar uma nova senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  E-mail cadastrado
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-base shadow-md transition-all mt-4"
              >
                {isSubmitting ? 'Enviando link...' : 'Enviar Link de Redefinição'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
