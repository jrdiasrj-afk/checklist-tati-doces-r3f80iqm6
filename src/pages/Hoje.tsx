import { useState, useEffect, useMemo, useCallback } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { AreaBadge } from '@/components/AreaBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { atribuicoesService } from '@/services/atribuicoes'
import { usersService } from '@/services/users'
import type { AtribuicaoRecord } from '@/types'
import { estaAtrasada, parseLimite } from '@/services/indicadores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast, Toaster } from 'sonner'
import confetti from 'canvas-confetti'
import {
  CheckCircle2,
  Camera,
  ClipboardList,
  AlertCircle,
  Zap,
  Thermometer,
  Type,
  X,
  Upload,
} from 'lucide-react'

const TIPO_LIMITE_MENCIONA = (limite?: string) => (limite ? `Limite: ${limite.slice(0, 5)}` : '')

export default function Hoje() {
  const { user } = useAuth()
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0])
  const [modalAberto, setModalAberto] = useState<AtribuicaoRecord | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const items = await atribuicoesService.listByDate(data, user.id)
      setAtribuicoes(items)
    } catch (err) {
      toast.error('Erro ao carregar suas tarefas de hoje.')
    } finally {
      setLoading(false)
    }
  }, [data, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Registra evidência de acesso (users.ultimo_acesso) para a seção
  // "Não estão acessando" da dashboard — fire-and-forget, sem quebrar a tela.
  useEffect(() => {
    if (!user) return
    usersService.touchUltimoAcesso(user.id).catch(() => {
      /* silencioso: falha de permissão não deve impactar a tela */
    })
  }, [user])

  // Tempo real
  useRealtime('atribuicoes', loadData)

  const agora = new Date()

  const pendentes = atribuicoes.filter((a) => a.status === 'pendente' && !estaAtrasada(a, agora))
  const atrasadas = atribuicoes.filter((a) => a.status === 'pendente' && estaAtrasada(a, agora))
  const concluidas = atribuicoes.filter((a) => a.status !== 'pendente')

  const abrirModal = (a: AtribuicaoRecord) => {
    setModalAberto(a)
  }

  const concluir = async (payload: {
    status: 'concluida' | 'nao_aplicavel'
    observacao?: string
    fotoFile?: File | null
    medicao_valor?: number
    fora_padrao?: boolean
  }) => {
    if (!modalAberto) return
    try {
      await atribuicoesService.updateStatus(modalAberto.id, {
        status: payload.status,
        observacao: payload.observacao,
        fotoFile: payload.fotoFile,
        concluida_em: new Date().toISOString(),
        medicao_valor: payload.medicao_valor,
        fora_padrao: payload.fora_padrao,
      })
      toast.success(
        payload.status === 'concluida' ? 'Item concluído! 🎉' : 'Item marcado como N/A.',
      )
      if (payload.status === 'concluida') {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } })
      }
      setModalAberto(null)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar o item.')
    }
  }

  const formatarData = (d: string) => {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  }

  const resumo = useMemo(() => {
    const total = atribuicoes.length
    const feitas = concluidas.length
    return {
      total,
      feitas,
      atrasadas: atrasadas.length,
      percentual: total === 0 ? 0 : Math.round((feitas / total) * 100),
    }
  }, [atribuicoes, concluidas, atrasadas])

  if (loading) {
    return (
      <MainLayout>
        <div className="py-12 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#E0447C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Toaster position="top-center" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#3B2B2B]">
            Minhas Tarefas
          </h1>
          <p className="text-sm text-[#8A6F6F] mt-1">Checklist de hoje · {formatarData(data)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-40 h-10 rounded-xl bg-white border-[#F2A65A]/30 text-sm"
          />
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-[#F2A65A]/20 p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-[#3B2B2B]">{resumo.feitas}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A6F6F]">Feitas</p>
        </div>
        <div className="rounded-2xl bg-white border border-[#F2A65A]/20 p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-[#E5484D]">{resumo.atrasadas}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A6F6F]">Atrasadas</p>
        </div>
        <div className="rounded-2xl bg-white border border-[#F2A65A]/20 p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-[#2D7A51]">
            {resumo.percentual}%
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A6F6F]">Concluído</p>
        </div>
      </div>

      {/* Atrasadas */}
      {atrasadas.length > 0 && (
        <div className="mb-6 rounded-3xl border border-[#E5484D]/30 bg-[#FFF5F5] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-[#E5484D]" />
            <h2 className="text-sm font-display font-bold text-[#E5484D]">
              Atrasadas ({atrasadas.length})
            </h2>
          </div>
          <p className="text-xs text-[#8A6F6F] mb-3">
            Passaram do horário-limite, mas ainda podem ser feitas.
          </p>
          <div className="space-y-2">
            {atrasadas.map((a) => (
              <AtribuicaoItem
                key={a.id}
                a={a}
                atrasada
                onConcluir={() => abrirModal(a)}
                onNA={() => abrirModal(a)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pendentes */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-[#E0447C]" />
          <h2 className="text-sm font-display font-bold text-[#3B2B2B]">
            Pendentes ({pendentes.length})
          </h2>
        </div>
        {pendentes.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-dashed border-[#F2A65A]/40 bg-[#FFF9F2]/50">
            <CheckCircle2 className="w-8 h-8 text-[#2D7A51] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#8A6F6F]">Nada pendente por aqui. 👏</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map((a) => (
              <AtribuicaoItem
                key={a.id}
                a={a}
                onConcluir={() => abrirModal(a)}
                onNA={() => abrirModal(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Concluídas / N/A */}
      {concluidas.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#2D7A51]" />
            <h2 className="text-sm font-display font-bold text-[#3B2B2B]">
              Concluídas ({concluidas.length})
            </h2>
          </div>
          <div className="space-y-2 opacity-80">
            {concluidas.map((a) => (
              <AtribuicaoItem key={a.id} a={a} apenasLeitura />
            ))}
          </div>
        </div>
      )}

      {/* Modal de conclusão */}
      {modalAberto && (
        <ConcluirModal
          atribuicao={modalAberto}
          onClose={() => setModalAberto(null)}
          onConfirm={concluir}
        />
      )}
    </MainLayout>
  )
}

/* ============ Item da lista ============ */

function AtribuicaoItem({
  a,
  atrasada = false,
  apenasLeitura = false,
  onConcluir,
  onNA,
}: {
  a: AtribuicaoRecord
  atrasada?: boolean
  apenasLeitura?: boolean
  onConcluir?: () => void
  onNA?: () => void
}) {
  const tarefa = a.expand?.tarefa
  const processo = tarefa?.expand?.processo
  const critica = !!tarefa?.critica

  return (
    <div
      className={`p-4 rounded-2xl border transition ${
        atrasada
          ? 'bg-white border-[#E5484D]/40 shadow-[0_2px_10px_rgba(229,72,77,0.08)]'
          : a.status === 'concluida'
            ? 'bg-[#EDF8F1]/60 border-[#2D7A51]/20'
            : a.status === 'nao_aplicavel'
              ? 'bg-stone-50 border-stone-200'
              : 'bg-white border-[#F2A65A]/25'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {processo && <AreaBadge area={processo.area} size="sm" />}
            {critica && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E5484D] bg-[#E5484D]/10 px-2 py-0.5 rounded-full border border-[#E5484D]/25">
                <Zap className="w-2.5 h-2.5" /> Crítica
              </span>
            )}
            {atrasada && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#E5484D] px-2 py-0.5 rounded-full">
                <AlertCircle className="w-2.5 h-2.5" /> Atrasada
              </span>
            )}
          </div>
          <h4
            className={`text-sm font-bold text-[#3B2B2B] ${a.status === 'concluida' ? 'line-through opacity-60' : ''}`}
          >
            {tarefa?.titulo || 'Tarefa removida'}
          </h4>
          <p className="text-[11px] text-[#8A6F6F] mt-0.5">
            {processo?.nome}{' '}
            {TIPO_LIMITE_MENCIONA(a.horario_limite) &&
              `· ${TIPO_LIMITE_MENCIONA(a.horario_limite)}`}
          </p>

          {a.status === 'concluida' &&
            a.medicao_valor !== undefined &&
            a.medicao_valor !== null && (
              <p
                className={`text-[11px] font-semibold mt-1 ${a.fora_padrao ? 'text-[#E5484D]' : 'text-[#2D7A51]'}`}
              >
                <Thermometer className="w-3 h-3 inline mr-1" />
                Medido: {a.medicao_valor}
                {tarefa?.medicao_unidade || ''}
                {a.fora_padrao && ' · fora do padrão'}
              </p>
            )}
          {a.status === 'concluida' && a.observacao && (
            <p className="text-[11px] text-[#8A6F6F] mt-1 italic">“{a.observacao}”</p>
          )}
          {a.status === 'nao_aplicavel' && (
            <p className="text-[11px] text-stone-500 mt-1 italic">
              N/A{a.observacao ? ` — ${a.observacao}` : ''}
            </p>
          )}
        </div>

        {!apenasLeitura && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={onConcluir}
              className="h-8 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-[11px] font-bold px-3"
            >
              Concluir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onNA}
              className="h-8 rounded-full border-[#F2A65A]/40 text-[#8A6F6F] text-[11px] font-semibold px-3"
            >
              N/A
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ Modal de conclusão ============ */

function ConcluirModal({
  atribuicao,
  onClose,
  onConfirm,
}: {
  atribuicao: AtribuicaoRecord
  onClose: () => void
  onConfirm: (p: {
    status: 'concluida' | 'nao_aplicavel'
    observacao?: string
    fotoFile?: File | null
    medicao_valor?: number
    fora_padrao?: boolean
  }) => void
}) {
  const tarefa = atribuicao.expand?.tarefa
  const tipo = tarefa?.tipo_registro || 'nenhum'
  const exigeFoto = tipo === 'foto' || !!tarefa?.evidencia_obrigatoria
  const exigeTexto = tipo === 'texto'
  const exigeMedicao = tipo === 'medicao'

  const [observacao, setObservacao] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [medicaoStr, setMedicaoStr] = useState('')
  const [modoNA, setModoNA] = useState(false)
  const [erro, setErro] = useState('')

  const atrasada = estaAtrasada(atribuicao)

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFotoFile(f)
    setFotoPreview(f ? URL.createObjectURL(f) : null)
  }

  const submit = () => {
    setErro('')

    if (modoNA) {
      if (!observacao.trim()) {
        setErro('Descreva o motivo de não se aplicar.')
        return
      }
      onConfirm({ status: 'nao_aplicavel', observacao: observacao.trim() })
      return
    }

    if (exigeFoto && !fotoFile) {
      setErro('Este item exige uma foto para ser concluído.')
      return
    }
    if (exigeMedicao) {
      if (medicaoStr.trim() === '') {
        setErro('Informe o valor medido para concluir.')
        return
      }
      const v = Number(medicaoStr.replace(',', '.'))
      if (Number.isNaN(v)) {
        setErro('Valor medido inválido.')
        return
      }
      const alvo = tarefa?.medicao_alvo
      const max = tarefa?.medicao_max
      const limite = max !== undefined && max !== null ? max : alvo
      const fora =
        limite !== undefined && limite !== null && limite !== 0
          ? v > limite
          : alvo !== undefined && alvo !== null
            ? v !== alvo
            : false
      onConfirm({
        status: 'concluida',
        medicao_valor: v,
        fora_padrao: fora,
        observacao: observacao.trim() || undefined,
      })
      return
    }
    if (exigeTexto && !observacao.trim()) {
      setErro('Este item exige uma observação em texto para ser concluído.')
      return
    }
    onConfirm({ status: 'concluida', observacao: observacao.trim() || undefined, fotoFile })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#F2A65A]/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-[#8A6F6F] hover:bg-[#FFF3E8] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-display font-bold text-[#3B2B2B] pr-8">
          {modoNA ? 'Marcar como N/A' : 'Concluir Item'}
        </h2>
        <p className="text-xs text-[#8A6F6F] mt-1 mb-4">{tarefa?.titulo}</p>

        {atrasada && (
          <div className="mb-4 p-3 rounded-xl bg-[#FFF5F5] border border-[#E5484D]/25 text-xs text-[#E5484D] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Este item está atrasado — pode ser concluído mesmo assim, e o atraso fica registrado.
          </div>
        )}

        <div className="space-y-4">
          {exigeMedicao && !modoNA && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
                Valor medido {tarefa?.medicao_unidade ? `(${tarefa.medicao_unidade})` : ''}
                {tarefa?.medicao_alvo !== undefined && tarefa?.medicao_alvo !== null
                  ? ` · alvo: até ${tarefa.medicao_alvo}${tarefa.medicao_unidade || ''}`
                  : ''}
              </Label>
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={`Ex.: ${tarefa?.medicao_alvo ?? 0}`}
                value={medicaoStr}
                onChange={(e) => setMedicaoStr(e.target.value)}
                className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
              />
            </div>
          )}

          {exigeFoto && !modoNA && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
                Foto de Evidência *
              </Label>
              {fotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#F2A65A]/30">
                  <img src={fotoPreview} alt="Prévia" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFotoFile(null)
                      setFotoPreview(null)
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-[#F2A65A]/40 bg-[#FFF9F2]/50 cursor-pointer hover:border-[#E0447C]/50 transition">
                  <Upload className="w-5 h-5 text-[#E0447C]" />
                  <span className="text-xs font-semibold text-[#8A6F6F]">
                    Tirar ou escolher foto
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFoto}
                  />
                </label>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
              {exigeTexto ? 'Observação *' : 'Observação (opcional)'}
            </Label>
            <Textarea
              rows={3}
              placeholder={
                exigeTexto
                  ? 'Descreva o que foi verificado/registrado (obrigatório)...'
                  : modoNA
                    ? 'Por que este item não se aplica hoje?'
                    : 'Alguma observação?'
              }
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] resize-none"
            />
          </div>

          {erro && (
            <p className="text-xs font-semibold text-[#E5484D] bg-[#FFF5F5] border border-[#E5484D]/25 rounded-xl px-3 py-2">
              {erro}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#8A6F6F] cursor-pointer">
              <Switch checked={modoNA} onCheckedChange={setModoNA} /> Não se aplica
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-full border-[#F2A65A]/40 text-[#3B2B2B] text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={submit}
                className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold px-6"
              >
                {modoNA ? 'Marcar N/A' : 'Concluir'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
