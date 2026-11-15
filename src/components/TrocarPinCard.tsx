import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Fingerprint, Loader2, ArrowLeft, Delete, CheckCircle2, KeyRound } from 'lucide-react'

const TECLADO = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar']

type Campo = 'atual' | 'novo' | 'confirmar'

interface TrocarPinCardProps {
  onConcluido: () => void
}

/**
 * Seção "Alterar PIN" da tela Perfil: três campos digitados em teclado
 * numérico (máscara de pontos, como no login), validação no servidor
 * (POST /backend/v1/auth/trocar-pin) e, ao concluir, encerra a sessão para
 * o colaborador entrar com o novo PIN na tela de login.
 */
export function TrocarPinCard({ onConcluido }: TrocarPinCardProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [campoAtivo, setCampoAtivo] = useState<Campo>('atual')
  const [pinAtual, setPinAtual] = useState('')
  const [novoPin, setNovoPin] = useState('')
  const [confirmarPin, setConfirmarPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  const valores: Record<Campo, string> = {
    atual: pinAtual,
    novo: novoPin,
    confirmar: confirmarPin,
  }
  const setters: Record<Campo, (v: string) => void> = {
    atual: setPinAtual,
    novo: setNovoPin,
    confirmar: setConfirmarPin,
  }
  const rotulos: Record<Campo, string> = {
    atual: 'PIN Atual',
    novo: 'Novo PIN (4 a 6 dígitos)',
    confirmar: 'Confirme o Novo PIN',
  }
  const ordem: Campo[] = ['atual', 'novo', 'confirmar']

  const digitar = (d: string) => {
    if (enviando || concluido) return
    setErro(null)
    if (d === 'apagar') {
      setters[campoAtivo](valores[campoAtivo].slice(0, -1))
      return
    }
    const atual = valores[campoAtivo]
    if (atual.length >= 6) return
    const proximo = atual + d
    setters[campoAtivo](proximo)
    // Ao completar um campo, pula automaticamente para o próximo.
    if (proximo.length >= 4) {
      const idx = ordem.indexOf(campoAtivo)
      const seguinte = ordem[idx + 1]
      if (seguinte) setTimeout(() => setCampoAtivo(seguinte), 200)
    }
  }

  const handleConfirmar = async () => {
    if (enviando) return
    setErro(null)

    if (!/^\d{4,6}$/.test(pinAtual)) {
      setErro('Digite o seu PIN atual (4 a 6 dígitos) para confirmar.')
      setCampoAtivo('atual')
      return
    }
    if (!/^\d{4,6}$/.test(novoPin)) {
      setErro('O novo PIN deve ter de 4 a 6 dígitos numéricos.')
      setCampoAtivo('novo')
      return
    }
    if (novoPin === pinAtual) {
      setErro('O novo PIN deve ser diferente do PIN atual.')
      setCampoAtivo('novo')
      return
    }
    if (novoPin !== confirmarPin) {
      setErro('A confirmação do novo PIN não confere. Verifique e tente novamente.')
      setCampoAtivo('confirmar')
      return
    }

    setEnviando(true)
    try {
      await pb.send('/backend/v1/auth/trocar-pin', {
        method: 'POST',
        body: JSON.stringify({
          pin_atual: pinAtual,
          novo_pin: novoPin,
          confirmar_pin: confirmarPin,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      setConcluido(true)
      toast.success('PIN alterado com sucesso! Entre com o novo PIN. 🧁')
      // Encerra a sessão e volta ao login por PIN (o novo PIN abre a conta).
      setTimeout(() => {
        onConcluido()
        logout()
        navigate('/')
      }, 1800)
    } catch (err: any) {
      const msg =
        err?.response?.error ||
        err?.error ||
        err?.data?.message ||
        err?.message ||
        'Não foi possível alterar o PIN. Tente novamente.'
      setErro(msg)
      setCampoAtivo('atual')
    } finally {
      setEnviando(false)
    }
  }

  const limpar = () => {
    setPinAtual('')
    setNovoPin('')
    setConfirmarPin('')
    setErro(null)
    setCampoAtivo('atual')
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
      <div className="flex items-center gap-2 pb-4 border-b border-[#F2A65A]/15 mb-4">
        <KeyRound className="w-5 h-5 text-[#E0447C]" />
        <h3 className="font-display font-bold text-lg text-[#3B2B2B]">Alterar PIN</h3>
      </div>

      {concluido ? (
        <div className="p-4 rounded-2xl bg-[#3FA372]/15 border border-[#3FA372]/30 text-xs text-[#2D7A51] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">PIN alterado com sucesso!</p>
            <p className="mt-1">Você será desconectado para entrar com o seu novo PIN.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-[#8A6F6F] leading-relaxed mb-4">
            Para sua segurança, informe o PIN atual antes de escolher um novo. Ao concluir, você sai
            da conta e entra com o novo PIN na tela de login.
          </p>

          {/* Campos com máscara de pontos (como no login por PIN) */}
          <div className="space-y-3 mb-4">
            {ordem.map((campo) => (
              <button
                key={campo}
                type="button"
                onClick={() => setCampoAtivo(campo)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-3 text-left transition cursor-pointer',
                  campoAtivo === campo
                    ? 'border-[#E0447C]/50 bg-[#FFF3E8]'
                    : 'border-[#F2A65A]/30 bg-[#FFF9F2]/60',
                )}
              >
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#8A6F6F]">
                  {rotulos[campo]}
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Fingerprint className="w-4 h-4 text-[#E0447C] shrink-0" />
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'w-2.5 h-2.5 rounded-full border-2 transition-all',
                          i < valores[campo].length
                            ? 'bg-[#E0447C] border-[#E0447C]'
                            : campoAtivo === campo
                              ? 'bg-transparent border-[#F2A65A]/50'
                              : 'bg-transparent border-[#F2A65A]/25',
                        )}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {erro && <p className="text-xs font-semibold text-[#E5484D] mb-3">{erro}</p>}

          {/* Teclado numérico (mesmo padrão do login por PIN) */}
          {enviando ? (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-[#8A6F6F]">
              <Loader2 className="w-4 h-4 animate-spin" /> Alterando PIN...
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-3">
              {TECLADO.map((d, i) =>
                d === '' ? (
                  <span key={i} />
                ) : d === 'apagar' ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => digitar('apagar')}
                    className="h-14 rounded-2xl flex items-center justify-center text-[#8A6F6F] hover:bg-[#FFF3E8] transition cursor-pointer"
                    aria-label="Apagar"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => digitar(d)}
                    className="h-14 rounded-2xl text-xl font-bold text-[#3B2B2B] bg-[#FFF9F2] border border-[#F2A65A]/30 hover:bg-[#FFF3E8] active:scale-95 transition select-none cursor-pointer"
                  >
                    {d}
                  </button>
                ),
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={limpar}
              disabled={enviando}
              className="rounded-full text-[#8A6F6F] hover:bg-[#FFF3E8] text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Limpar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmar}
              disabled={enviando}
              className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-xs px-6 cursor-pointer"
            >
              {enviando ? 'Salvando...' : 'Confirmar Novo PIN'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
