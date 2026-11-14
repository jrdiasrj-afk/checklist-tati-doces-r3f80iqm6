import React, { useState, useEffect, useMemo, useRef } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import { atribuicoesService } from '@/services/atribuicoes'
import { useRealtime } from '@/hooks/use-realtime'
import type { AtribuicaoRecord } from '@/types'
import { AreaBadge } from '@/components/AreaBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Check,
  CheckCircle2,
  Clock,
  Camera,
  MoreVertical,
  X,
  UploadCloud,
  MinusCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

export default function Hoje() {
  const { user } = useAuth()
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Data atual
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  // Sheet / Modal de Conclusão da Tarefa
  const [activeTaskToComplete, setActiveTaskToComplete] = useState<AtribuicaoRecord | null>(null)
  const [observacao, setObservacao] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Modal para marcar "Não se aplica"
  const [taskNotApplicable, setTaskNotApplicable] = useState<AtribuicaoRecord | null>(null)
  const [motivoNotApplicable, setMotivoNotApplicable] = useState('')

  // Efeito de confetes no item recém concluído
  const [celebratedTaskId, setCelebratedTaskId] = useState<string | null>(null)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMinhasTarefas = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await atribuicoesService.listByDate(todayStr, user.id)
      setAtribuicoes(data)
    } catch (err) {
      toast.error('Erro ao carregar tarefas do dia.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMinhasTarefas()
  }, [user, todayStr])

  // Tempo real: novas atribuições adicionadas pelo gerente chegam na hora
  useRealtime<AtribuicaoRecord>('atribuicoes', (e) => {
    if (user && (e.action === 'create' || e.action === 'update' || e.action === 'delete')) {
      loadMinhasTarefas()
    }
  })

  // Métricas de progresso do dia
  const total = atribuicoes.length
  const concluidas = atribuicoes.filter((a) => a.status === 'concluida').length
  const porcentagem = total > 0 ? Math.round((concluidas / total) * 100) : 0

  // Agrupadas por processo
  const groupedByProcesso = useMemo(() => {
    const map = new Map<string, { nome: string; area: string; items: AtribuicaoRecord[] }>()

    atribuicoes.forEach((atrib) => {
      const proc = atrib.expand?.tarefa?.expand?.processo
      const procId = proc?.id || 'geral'
      const procNome = proc?.nome || 'Rotina Operacional'
      const procArea = proc?.area || 'Loja'

      if (!map.has(procId)) {
        map.set(procId, { nome: procNome, area: procArea, items: [] })
      }
      map.get(procId)!.items.push(atrib)
    })

    return Array.from(map.values())
  }, [atribuicoes])

  // Abrir Modal de Conclusão
  const handleOpenCompleteModal = (atrib: AtribuicaoRecord) => {
    setActiveTaskToComplete(atrib)
    setObservacao(atrib.observacao || '')
    setFotoFile(null)
    setFotoPreview(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  // Concluir Tarefa
  const handleConfirmCompletion = async (skipPhoto = false) => {
    if (!activeTaskToComplete) return

    const tarefa = activeTaskToComplete.expand?.tarefa
    if (tarefa?.evidencia_obrigatoria && !fotoFile && !skipPhoto) {
      toast.warning('Esta tarefa exige foto de comprovação.')
      return
    }

    setSubmitting(true)
    try {
      await atribuicoesService.updateStatus(activeTaskToComplete.id, {
        status: 'concluida',
        observacao: observacao.trim() || undefined,
        fotoFile: skipPhoto ? null : fotoFile,
        concluida_em: new Date().toISOString(),
      })

      const completedId = activeTaskToComplete.id
      setActiveTaskToComplete(null)
      setCelebratedTaskId(completedId)
      setTimeout(() => setCelebratedTaskId(null), 1500)

      toast.success('Tarefa concluída com sucesso! 🧁 Parabéns!')
      loadMinhasTarefas()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Erro ao registrar conclusão.')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirmar Não se aplica
  const handleConfirmNotApplicable = async () => {
    if (!taskNotApplicable) return
    setSubmitting(true)
    try {
      await atribuicoesService.updateStatus(taskNotApplicable.id, {
        status: 'nao_aplicavel',
        observacao: motivoNotApplicable.trim()
          ? `Motivo N/A: ${motivoNotApplicable.trim()}`
          : 'Não se aplica ao turno',
      })
      toast.info('Tarefa marcada como Não se aplica.')
      setTaskNotApplicable(null)
      setMotivoNotApplicable('')
      loadMinhasTarefas()
    } catch (err) {
      toast.error('Erro ao atualizar status.')
    } finally {
      setSubmitting(false)
    }
  }

  // Data por extenso
  const dataExtenso = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* ================= HEADER DO DIA & BARRA DE PROGRESSO ================= */}
        <div className="bg-white rounded-3xl p-6 border border-[#F2A65A]/20 shadow-[0_4px_16px_rgba(59,43,43,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase font-extrabold tracking-wider text-[#8A6F6F]">
                {dataExtenso}
              </p>
              <h2 className="text-2xl font-display font-extrabold text-[#3B2B2B]">
                Suas Tarefas de Hoje
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FFF3E8] flex items-center justify-center text-2xl font-bold">
              {porcentagem === 100 ? '🎉' : '☕'}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-[#3B2B2B]">Progresso do Dia</span>
              <span className="text-[#E0447C]">
                {concluidas} de {total} concluídas ({porcentagem}%)
              </span>
            </div>
            <div className="w-full h-3 bg-[#FFF3E8] rounded-full overflow-hidden border border-[#F2A65A]/20">
              <div
                className="h-full bg-gradient-to-r from-[#F2A65A] to-[#E0447C] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
        </div>

        {/* ================= LISTA DE TAREFAS POR PROCESSO ================= */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 rounded-3xl bg-white animate-pulse border border-[#F2A65A]/20"
              />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#F2A65A]/20 shadow-xs">
            <span className="text-6xl block mb-3">🧁</span>
            <h3 className="text-xl font-display font-bold text-[#3B2B2B]">
              Nenhuma tarefa para hoje!
            </h3>
            <p className="text-sm text-[#8A6F6F] mt-2 max-w-xs mx-auto leading-relaxed">
              Tudo em ordem por enquanto. Aproveite o descanso ou aguarde a escala ser liberada! 🧁
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByProcesso.map((group, gIdx) => (
              <div
                key={gIdx}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F2A65A]/20 shadow-xs"
              >
                {/* Header do Processo */}
                <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-[#F2A65A]/15">
                  <div className="flex items-center gap-2">
                    <AreaBadge area={group.area} size="sm" />
                    <h3 className="font-display font-bold text-base text-[#3B2B2B]">
                      {group.nome}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#8A6F6F]">
                    {group.items.filter((i) => i.status === 'concluida').length}/
                    {group.items.length}
                  </span>
                </div>

                {/* Itens do Checklist */}
                <div className="space-y-2.5">
                  {group.items.map((item) => {
                    const isConcluida = item.status === 'concluida'
                    const isNaoAplicavel = item.status === 'nao_aplicavel'
                    const isPending = item.status === 'pendente'
                    const isCelebrating = celebratedTaskId === item.id
                    const tarefa = item.expand?.tarefa

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex items-start justify-between gap-3 ${
                          isConcluida
                            ? 'bg-[#EDF8F1]/40 border-[#3FA372]/30'
                            : isNaoAplicavel
                              ? 'bg-stone-50 border-stone-200 opacity-60'
                              : 'bg-[#FFF9F2]/60 hover:bg-[#FFF9F2] border-[#F2A65A]/30'
                        } ${isCelebrating ? 'animate-confete-check bg-[#EDF8F1]' : ''}`}
                      >
                        {/* Microinteração de Confeitos Saltando */}
                        {isCelebrating && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                            <span className="text-xl animate-bounce">✨</span>
                            <span className="text-xl animate-ping">🧁</span>
                          </div>
                        )}

                        <div className="flex items-start gap-3 min-w-0">
                          {/* Checkbox circular grande touch ≥48px */}
                          <button
                            type="button"
                            disabled={isConcluida}
                            onClick={() => handleOpenCompleteModal(item)}
                            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                              isConcluida
                                ? 'bg-[#3FA372] text-white shadow-xs'
                                : isNaoAplicavel
                                  ? 'bg-stone-200 text-stone-500'
                                  : 'border-2 border-[#E0447C] bg-white text-transparent hover:border-[#C23066]'
                            }`}
                            aria-label={`Concluir ${tarefa?.titulo}`}
                          >
                            {isConcluida && <Check className="w-6 h-6 stroke-[3]" />}
                            {isNaoAplicavel && <MinusCircle className="w-5 h-5" />}
                          </button>

                          <div
                            onClick={() => !isConcluida && handleOpenCompleteModal(item)}
                            className={`min-w-0 cursor-pointer ${isConcluida ? 'cursor-default' : ''}`}
                          >
                            <h4
                              className={`text-sm font-bold leading-tight ${
                                isConcluida
                                  ? 'text-[#2D7A51] line-through'
                                  : isNaoAplicavel
                                    ? 'text-stone-500 line-through'
                                    : 'text-[#3B2B2B]'
                              }`}
                            >
                              {tarefa?.titulo}
                            </h4>

                            {tarefa?.descricao && (
                              <p className="text-xs text-[#8A6F6F] mt-1 line-clamp-2">
                                {tarefa.descricao}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {tarefa?.evidencia_obrigatoria && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E0447C] bg-[#FFF3E8] px-2 py-0.5 rounded-full border border-[#E0447C]/20">
                                  <Camera className="w-3 h-3" /> Foto Obrigatória
                                </span>
                              )}

                              {item.observacao && (
                                <span className="text-[10px] text-[#8A6F6F] bg-white px-2 py-0.5 rounded-md border border-[#F2A65A]/20">
                                  "{item.observacao}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu 3 pontos para marcar "Não se aplica" */}
                        {isPending && (
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => setTaskNotApplicable(item)}
                              className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#3B2B2B] hover:bg-white transition cursor-pointer"
                              title="Marcar como não se aplica"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= BOTTOM SHEET MOBILE: CONCLUIR TAREFA ================= */}
      {activeTaskToComplete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[92vh] overflow-y-auto border-t sm:border border-[#F2A65A]/30 shadow-2xl subir-suave">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2A65A]/15 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#FFF3E8] text-[#E0447C]">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <h3 className="font-display font-bold text-lg text-[#3B2B2B]">
                  Concluir Checklist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskToComplete(null)}
                className="p-1 rounded-full text-[#8A6F6F] hover:bg-[#FFF3E8] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações da Tarefa */}
            <div className="mb-4">
              <h4 className="text-base font-bold text-[#3B2B2B]">
                {activeTaskToComplete.expand?.tarefa?.titulo}
              </h4>
              {activeTaskToComplete.expand?.tarefa?.descricao && (
                <p className="text-xs text-[#8A6F6F] mt-1 bg-[#FFF9F2] p-3 rounded-xl border border-[#F2A65A]/20">
                  {activeTaskToComplete.expand.tarefa.descricao}
                </p>
              )}
            </div>

            {/* Foto de Evidência */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#E0447C]" />
                  Foto de Evidência{' '}
                  {activeTaskToComplete.expand?.tarefa?.evidencia_obrigatoria ? (
                    <span className="text-[#E0447C] font-extrabold">(Obrigatória)</span>
                  ) : (
                    <span className="text-[#8A6F6F] font-normal">(Opcional)</span>
                  )}
                </Label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {fotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#F2A65A]/30">
                  <img src={fotoPreview} alt="Prévia" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFotoFile(null)
                      setFotoPreview(null)
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-[#F2A65A]/40 rounded-2xl bg-[#FFF9F2]/50 hover:bg-[#FFF9F2] flex flex-col items-center justify-center text-[#8A6F6F] hover:text-[#E0447C] transition cursor-pointer"
                >
                  <Camera className="w-7 h-7 mb-1" />
                  <span className="text-xs font-bold">Tirar foto com câmera ou anexar arquivo</span>
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    JPG, PNG ou WebP até 5MB
                  </span>
                </button>
              )}
            </div>

            {/* Campo de Observação */}
            <div className="space-y-1.5 mb-6">
              <Label
                htmlFor="obs"
                className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
              >
                Observação / Comentário (opcional)
              </Label>
              <Textarea
                id="obs"
                rows={2}
                placeholder="Ex.: Forno estava em 175°C e foi recalibrado..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] resize-none"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2">
              {!activeTaskToComplete.expand?.tarefa?.evidencia_obrigatoria && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleConfirmCompletion(true)}
                  disabled={submitting}
                  className="rounded-full border-stone-300 text-[#8A6F6F] hover:bg-[#FFF9F2] text-xs font-semibold py-3"
                >
                  Pular foto e concluir
                </Button>
              )}

              <Button
                type="button"
                onClick={() => handleConfirmCompletion(false)}
                disabled={
                  submitting ||
                  (activeTaskToComplete.expand?.tarefa?.evidencia_obrigatoria && !fotoFile)
                }
                className="flex-1 rounded-full bg-[#3FA372] hover:bg-[#34885E] text-white font-bold text-sm shadow-md py-3 cursor-pointer"
              >
                {submitting ? 'Salvando...' : 'Concluir Tarefa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL "NÃO SE APLICA" ================= */}
      {taskNotApplicable && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#F2A65A]/20 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#3B2B2B]">
              Marcar como Não se Aplica
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-1">
              Esta tarefa ficará com status neutro na dashboard do gerente hoje.
            </p>

            <div className="mt-4 space-y-1.5">
              <Label className="text-xs font-bold text-[#3B2B2B]">Motivo (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ex.: Loja fechada mais cedo para manutenção..."
                value={motivoNotApplicable}
                onChange={(e) => setMotivoNotApplicable(e.target.value)}
                className="rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs resize-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTaskNotApplicable(null)}
                className="rounded-full border-stone-300 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmNotApplicable}
                className="rounded-full bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
