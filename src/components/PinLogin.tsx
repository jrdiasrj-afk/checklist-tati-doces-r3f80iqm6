import { useEffect, useState } from 'react'
import type { RecordModel } from 'pocketbase'
import { ArrowLeft, Delete, Fingerprint, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

interface ColaboradorPublico {
  id: string
  name: string
  local?: string
}

interface PinLoginProps {
  onVoltar: () => void
  onSucesso: (nome: string) => void
}

const TECLADO = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar']

/**
 * Aba "Sou colaborador" do login: o colaborador escolhe o próprio nome
 * (lista pública — sem PIN) e digita o PIN recebido do supervisor.
 * A rota /backend/v1/auth/pin devolve um token de auth oficial do PocketBase,
 * então a sessão passa a valer exatamente como no login por e-mail/senha.
 *
 * PINs do sistema têm 4 dígitos (gerados automaticamente), mas o gerente
 * pode definir 6: tentamos com 4 e, se falhar, deixamos continuar até 6.
 */
export const PinLogin: React.FC<PinLoginProps> = ({ onVoltar, onSucesso }) => {
  const [colaboradores, setColaboradores] = useState<ColaboradorPublico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [selecionado, setSelecionado] = useState<ColaboradorPublico | null>(null)
  const [busca, setBusca] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [tremendo, setTremendo] = useState(false)

  useEffect(() => {
    let vivo = true
    const carregar = async () => {
      try {
        const res = await pb.send('/backend/v1/auth/colaboradores', { method: 'GET' })
        if (vivo && res?.colaboradores) setColaboradores(res.colaboradores)
      } catch {
        if (vivo) setErro('Não foi possível carregar a lista de colaboradores.')
      } finally {
        if (vivo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      vivo = false
    }
  }, [])

  const entrarComPin = async (pinCompleto: string) => {
    if (!selecionado || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const res = await pb.send('/backend/v1/auth/pin', {
        method: 'POST',
        body: JSON.stringify({ pin: pinCompleto }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res?.token || !res?.record) {
        throw new Error(res?.error || 'PIN inválido.')
      }

      // Sessão oficial do PocketBase — mesma mecânica do login por senha.
      const rec: RecordModel = {
        id: res.record.id,
        name: res.record.name,
        email: res.record.email,
        avatar: res.record.avatar,
        role: res.record.role,
        local: res.record.local,
        collectionName: 'users',
        collectionId: '_pb_users_auth_',
      }
      pb.authStore.save(res.token, rec)
      onSucesso(res.record.name || 'Colaborador')
    } catch (err: any) {
      const msg =
        err?.response?.error || err?.error || err?.message || 'PIN inválido. Tente novamente.'
      setErro(msg)
      setTremendo(true)
      setTimeout(() => setTremendo(false), 500)
      // PIN de 4 dígitos pode ser apenas o começo de um PIN de 6:
      // mantemos os dígitos para o colaborador continuar digitando.
      if (pinCompleto.length >= 6) setPin('')
    } finally {
      setEnviando(false)
    }
  }

  const digitar = (d: string) => {
    if (enviando) return
    setErro(null)
    if (d === 'apagar') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= 6) return
    const novo = pin + d
    setPin(novo)
    if (novo.length === 4 || novo.length === 6) {
      setTimeout(() => entrarComPin(novo), 150)
    }
  }

  const filtrados = colaboradores.filter((c) =>
    c.name?.toLowerCase().includes(busca.trim().toLowerCase()),
  )

  // ===== Passo 2: teclado de PIN =====
  if (selecionado) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setSelecionado(null)
            setPin('')
            setErro(null)
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A6F6F] hover:text-[#E0447C] mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Trocar colaborador
        </button>

        <div className="w-14 h-14 rounded-2xl bg-[#E0447C]/10 flex items-center justify-center mx-auto mb-3">
          <Fingerprint className="w-7 h-7 text-[#E0447C]" />
        </div>
        <p className="text-sm font-bold text-[#3B2B2B]">{selecionado.name}</p>
        <p className="text-xs text-[#8A6F6F] mt-0.5 mb-4">Digite o seu PIN para entrar</p>

        {/* Pontinhos do PIN (4 a 6) */}
        <div
          className={cn('flex items-center justify-center gap-3 mb-3', tremendo && 'animate-pulse')}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-3 h-3 rounded-full border-2 transition-all',
                i < pin.length
                  ? 'bg-[#E0447C] border-[#E0447C] scale-110'
                  : i < 4
                    ? 'bg-transparent border-[#F2A65A]/50'
                    : 'bg-transparent border-[#F2A65A]/20',
              )}
            />
          ))}
        </div>

        {erro && <p className="text-xs font-semibold text-[#E5484D] mb-2 px-4">{erro}</p>}

        {enviando ? (
          <div className="py-6 flex items-center justify-center gap-2 text-sm text-[#8A6F6F]">
            <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 mt-3 max-w-[240px] mx-auto">
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
      </div>
    )
  }

  // ===== Passo 1: escolher o colaborador =====
  return (
    <div>
      <p className="text-sm text-[#8A6F6F] mb-3">
        Selecione o seu nome e digite o PIN que o supervisor passou para você.
      </p>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar seu nome..."
        className="w-full h-11 rounded-xl bg-[#FFF9F2]/60 border border-[#F2A65A]/30 px-4 text-sm text-[#3B2B2B] placeholder:text-[#B8AFA8] focus:outline-none focus:ring-2 focus:ring-[#E0447C]/40 mb-3"
      />

      {carregando ? (
        <div className="py-8 flex items-center justify-center gap-2 text-sm text-[#8A6F6F]">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando colaboradores...
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-xs text-[#8A6F6F] text-center py-6">
          Nenhum colaborador encontrado.{' '}
          {busca ? 'Tente outro nome.' : 'Peça ao gerente para cadastrar sua conta.'}
        </p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1 -mr-1">
          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionado(c)}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#F2A65A]/25 bg-[#FFF9F2]/40 hover:bg-[#FFF3E8] hover:border-[#E0447C]/40 transition flex items-center justify-between gap-2 cursor-pointer"
            >
              <span className="text-sm font-semibold text-[#3B2B2B] truncate">
                {c.name || 'Sem nome'}
              </span>
              <Fingerprint className="w-4 h-4 text-[#E0447C] shrink-0" />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onVoltar}
        className="w-full mt-4 text-xs font-semibold text-[#8A6F6F] hover:text-[#E0447C] cursor-pointer flex items-center justify-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para login com e-mail
      </button>
    </div>
  )
}
