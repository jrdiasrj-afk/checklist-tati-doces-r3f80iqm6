import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function VerificarEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de verificação ausente na URL.')
      return
    }

    const verify = async () => {
      try {
        await pb.collection('users').confirmVerification(token)
        setStatus('success')
        toast.success('E-mail verificado com sucesso!')
      } catch (err: any) {
        setStatus('error')
        setMessage(
          err?.data?.message || err?.message || 'O link de verificação expirou ou é inválido.',
        )
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-6 text-[#3B2B2B]">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md border border-[#F2A65A]/20 text-center">
        {status === 'verifying' && (
          <div>
            <Loader2 className="w-12 h-12 text-[#E0447C] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-[#3B2B2B]">
              Verificando seu e-mail...
            </h2>
            <p className="text-sm text-[#8A6F6F] mt-2">
              Só um instante enquanto ativamos sua conta.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 rounded-full bg-[#3FA372]/15 text-[#3FA372] mx-auto flex items-center justify-center text-3xl mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">
              E-mail Confirmado! 🧁
            </h2>
            <p className="text-sm text-[#8A6F6F] mt-2">
              Sua conta foi ativada com sucesso. Você já pode acessar o Tati Check.
            </p>
            <div className="mt-8">
              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold"
              >
                Fazer Login
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 rounded-full bg-[#E5484D]/15 text-[#E5484D] mx-auto flex items-center justify-center text-3xl mb-4">
              <AlertCircle className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#3B2B2B]">Falha na Verificação</h2>
            <p className="text-sm text-[#8A6F6F] mt-2">{message}</p>
            <div className="mt-8">
              <Link to="/">
                <Button className="w-full h-12 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold">
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
