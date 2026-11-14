import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { processosService } from '@/services/processos'
import type { ProcessoRecord, TarefaRecord, AreaProcesso, TipoRegistro, UserRecord } from '@/types'

/** Evidência por tarefa: mapeia para tipo_registro ('sem_registro'/'foto'/'video') + evidencia_obrigatoria */
type Evidencia =
  | 'nenhuma'
  | 'foto_obrigatoria'
  | 'foto_opcional'
  | 'video_obrigatorio'
  | 'video_opcional'

const evidenciaDaTarefa = (
  t: Pick<TarefaRecord, 'tipo_registro' | 'evidencia_obrigatoria'>,
): Evidencia => {
  if (t.tipo_registro === 'video')
    return t.evidencia_obrigatoria ? 'video_obrigatorio' : 'video_opcional'
  if (t.tipo_registro === 'foto' || t.evidencia_obrigatoria)
    return t.evidencia_obrigatoria ? 'foto_obrigatoria' : 'foto_opcional'
  return 'nenhuma'
}
import { AreaBadge } from '@/components/AreaBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  RecorrenciaForm,
  recorrenciaDoProcesso,
  resumoRecorrencia,
  type RecorrenciaState,
} from '@/components/RecorrenciaForm'
import { usersService } from '@/services/users'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Camera,
  Video,
  Ruler,
  Type,
  Upload,
  Thermometer,
  Repeat,
  Zap,
  CheckCircle,
  X,
  AlertTriangle,
} from 'lucide-react'

export default function ProcessoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [processo, setProcesso] = useState<ProcessoRecord | null>(null)
  const [tarefas, setTarefas] = useState<TarefaRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de Tarefa (Criar ou Editar)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TarefaRecord | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [evidencia, setEvidencia] = useState<Evidencia>('nenhuma')
  const [ativa, setAtiva] = useState(true)
  const [critica, setCritica] = useState(false)
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('nenhum')
  const [medicaoAlvo, setMedicaoAlvo] = useState('')
  const [medicaoMax, setMedicaoMax] = useState('')
  const [medicaoUnidade, setMedicaoUnidade] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  // Recorrência do processo
  const [recorrencia, setRecorrencia] = useState<RecorrenciaState>(recorrenciaDoProcesso({}))
  const [colaboradores, setColaboradores] = useState<UserRecord[]>([])
  const [savingRecorrencia, setSavingRecorrencia] = useState(false)

  // Modal de Exclusão do Processo
  const [confirmDeleteProcesso, setConfirmDeleteProcesso] = useState(false)
  // Modal de Exclusão da Tarefa
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const loadProcessoAndTarefas = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [procData, tarefasData] = await Promise.all([
        processosService.getById(id),
        processosService.listTarefas(id),
      ])
      setProcesso(procData)
      setTarefas(tarefasData)
      setRecorrencia(recorrenciaDoProcesso(procData))
    } catch (err) {
      toast.error('Erro ao carregar detalhes do processo.')
      navigate('/processos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProcessoAndTarefas()
    usersService
      .list()
      .then(setColaboradores)
      .catch(() => {})
  }, [id])

  const handleOpenCreateTask = () => {
    setEditingTask(null)
    setTitulo('')
    setDescricao('')
    setEvidencia('nenhuma')
    setAtiva(true)
    setCritica(false)
    setTipoRegistro('nenhum')
    setMedicaoAlvo('')
    setMedicaoMax('')
    setMedicaoUnidade('')
    setIsTaskModalOpen(true)
  }

  const handleOpenEditTask = (task: TarefaRecord) => {
    setEditingTask(task)
    setTitulo(task.titulo)
    setDescricao(task.descricao || '')
    setEvidencia(evidenciaDaTarefa(task))
    setAtiva(task.ativa)
    setCritica(!!task.critica)
    setTipoRegistro(task.tipo_registro || 'nenhum')
    setMedicaoAlvo(
      task.medicao_alvo !== undefined && task.medicao_alvo !== null
        ? String(task.medicao_alvo)
        : '',
    )
    setMedicaoMax(
      task.medicao_max !== undefined && task.medicao_max !== null ? String(task.medicao_max) : '',
    )
    setMedicaoUnidade(task.medicao_unidade || '')
    setIsTaskModalOpen(true)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !id) return

    setSavingTask(true)
    try {
      const dadosTarefa = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        // As 5 opções de evidência mapeiam em tipo_registro + evidencia_obrigatoria
        evidencia_obrigatoria:
          evidencia === 'foto_obrigatoria' || evidencia === 'video_obrigatorio',
        ativa,
        critica,
        tipo_registro: (evidencia === 'foto_obrigatoria' || evidencia === 'foto_opcional'
          ? 'foto'
          : evidencia === 'video_obrigatorio' || evidencia === 'video_opcional'
            ? 'video'
            : tipoRegistro) as TipoRegistro,
        medicao_alvo:
          tipoRegistro === 'medicao' && medicaoAlvo !== '' ? Number(medicaoAlvo) : undefined,
        medicao_max:
          tipoRegistro === 'medicao' && medicaoMax !== '' ? Number(medicaoMax) : undefined,
        medicao_unidade: tipoRegistro === 'medicao' ? medicaoUnidade.trim() : undefined,
      }
      if (editingTask) {
        await processosService.updateTarefa(editingTask.id, dadosTarefa)
        toast.success('Tarefa atualizada!')
      } else {
        const nextOrder = tarefas.length > 0 ? Math.max(...tarefas.map((t) => t.ordem)) + 1 : 1
        await processosService.createTarefa({
          processo: id,
          ordem: nextOrder,
          ...dadosTarefa,
        })
        toast.success('Nova tarefa adicionada ao checklist!')
      }
      setIsTaskModalOpen(false)
      loadProcessoAndTarefas()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Erro ao salvar tarefa.')
    } finally {
      setSavingTask(false)
    }
  }

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= tarefas.length) return

    const taskCurrent = tarefas[index]
    const taskTarget = tarefas[targetIndex]

    const currentOrder = taskCurrent.ordem
    const targetOrder = taskTarget.ordem

    try {
      await Promise.all([
        processosService.updateTarefa(taskCurrent.id, { ordem: targetOrder }),
        processosService.updateTarefa(taskTarget.id, { ordem: currentOrder }),
      ])
      loadProcessoAndTarefas()
    } catch (err) {
      toast.error('Erro ao reordenar tarefas.')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await processosService.deleteTarefa(taskId)
      toast.success('Tarefa removida.')
      setDeletingTaskId(null)
      loadProcessoAndTarefas()
    } catch (err) {
      toast.error('Erro ao excluir tarefa.')
    }
  }

  const handleDeleteProcesso = async () => {
    if (!id) return
    try {
      await processosService.delete(id)
      toast.success('Processo excluído com sucesso.')
      navigate('/processos')
    } catch (err) {
      toast.error('Não foi possível excluir o processo.')
    }
  }

  if (loading || !processo) {
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
      {/* Botão Voltar */}
      <div className="mb-4">
        <Link
          to="/processos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8A6F6F] hover:text-[#E0447C] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Processos
        </Link>
      </div>

      {/* Cartão de Dados do Processo */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F2A65A]/15">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <AreaBadge area={processo.area} size="md" />
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  processo.ativo ? 'bg-[#EDF8F1] text-[#2D7A51]' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {processo.ativo ? 'Processo Ativo' : 'Inativo'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#3B2B2B]">
              {processo.nome}
            </h1>
            {processo.descricao && (
              <p className="text-sm text-[#8A6F6F] mt-2 max-w-2xl leading-relaxed">
                {processo.descricao}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setConfirmDeleteProcesso(true)}
              variant="outline"
              size="sm"
              className="rounded-full border-[#E5484D]/30 text-[#E5484D] hover:bg-[#E5484D]/10 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir Processo
            </Button>
            <Button
              onClick={handleOpenCreateTask}
              className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Adicionar Tarefa
            </Button>
          </div>
        </div>

        {/* Recorrência do processo (estilo Koncluí) */}
        <div className="mt-6 p-4 rounded-2xl bg-[#FFF9F2] border border-[#F2A65A]/20 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-[#E0447C]" /> Rotina Recorrente
            </p>
            <span className="text-[11px] font-semibold text-[#8A6F6F]">
              {resumoRecorrencia(recorrencia)}
            </span>
          </div>
          <RecorrenciaForm
            value={recorrencia}
            onChange={setRecorrencia}
            colaboradores={colaboradores}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={savingRecorrencia}
              onClick={async () => {
                if (!id) return
                setSavingRecorrencia(true)
                try {
                  await processosService.update(id, {
                    recorrencia: recorrencia.recorrencia,
                    dias_semana:
                      recorrencia.recorrencia === 'dias_semana' ? recorrencia.dias_semana : [],
                    horario_limite: recorrencia.horario_limite || '',
                    vigencia: recorrencia.vigencia || '',
                    designados: recorrencia.designados,
                  })
                  toast.success(
                    'Rotina recorrente salva! As tarefas serão geradas automaticamente.',
                  )
                  loadProcessoAndTarefas()
                } catch (err) {
                  toast.error('Erro ao salvar a recorrência.')
                } finally {
                  setSavingRecorrencia(false)
                }
              }}
              className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold px-5"
            >
              {savingRecorrencia ? 'Salvando...' : 'Salvar Recorrência'}
            </Button>
          </div>
        </div>

        {/* Lista de Tarefas do Checklist */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-[#3B2B2B]">
              Tarefas do Checklist ({tarefas.length})
            </h2>
            <span className="text-xs text-[#8A6F6F]">
              Ordene as tarefas conforme a sequência de execução
            </span>
          </div>

          {tarefas.length === 0 ? (
            <div className="text-center py-10 bg-[#FFF9F2]/50 rounded-2xl border border-dashed border-[#F2A65A]/30">
              <p className="text-sm font-semibold text-[#8A6F6F]">
                Nenhuma tarefa cadastrada neste processo ainda.
              </p>
              <Button
                onClick={handleOpenCreateTask}
                variant="outline"
                className="mt-3 rounded-full border-[#E0447C] text-[#E0447C] hover:bg-[#FFF3E8] text-xs font-bold"
              >
                + Adicionar Primeira Tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tarefas.map((task, idx) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-[#FFF9F2]/40 hover:bg-[#FFF9F2] border border-[#F2A65A]/20 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-white border border-[#F2A65A]/30 text-[#E0447C] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#3B2B2B]">{task.titulo}</h4>
                        {task.critica && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E5484D] bg-[#E5484D]/10 px-2 py-0.5 rounded-full border border-[#E5484D]/25">
                            <Zap className="w-3 h-3" /> Crítica
                          </span>
                        )}
                        {task.tipo_registro === 'foto' && task.evidencia_obrigatoria && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E0447C] bg-[#FFF3E8] px-2 py-0.5 rounded-full border border-[#E0447C]/20">
                            <Camera className="w-3 h-3" /> Foto Obrigatória
                          </span>
                        )}
                        {task.tipo_registro === 'foto' && !task.evidencia_obrigatoria && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D7A51] bg-[#EDF8F1] px-2 py-0.5 rounded-full border border-[#2D7A51]/20">
                            <Camera className="w-3 h-3" /> Foto opcional
                          </span>
                        )}
                        {task.tipo_registro === 'video' && task.evidencia_obrigatoria && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B7A9C] bg-[#EAF4FA] px-2 py-0.5 rounded-full border border-[#3B7A9C]/20">
                            <Video className="w-3 h-3" /> Vídeo Obrigatório
                          </span>
                        )}
                        {task.tipo_registro === 'video' && !task.evidencia_obrigatoria && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D7A51] bg-[#EDF8F1] px-2 py-0.5 rounded-full border border-[#2D7A51]/20">
                            <Video className="w-3 h-3" /> Vídeo opcional
                          </span>
                        )}
                        {task.tipo_registro === 'medicao' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B7A9C] bg-[#EAF4FA] px-2 py-0.5 rounded-full border border-[#3B7A9C]/20">
                            <Thermometer className="w-3 h-3" />
                            Medição
                            {task.medicao_alvo !== undefined && task.medicao_alvo !== null
                              ? `: até ${task.medicao_alvo}${task.medicao_unidade || ''}`
                              : ''}
                          </span>
                        )}
                        {task.tipo_registro === 'texto' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7A5C9C] bg-[#F3ECFA] px-2 py-0.5 rounded-full border border-[#7A5C9C]/20">
                            <Type className="w-3 h-3" /> Texto obrigatório
                          </span>
                        )}
                        {!task.ativa && (
                          <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                            Inativa
                          </span>
                        )}
                      </div>
                      {task.descricao && (
                        <p className="text-xs text-[#8A6F6F] mt-1 leading-relaxed">
                          {task.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações: Reordenar / Editar / Excluir */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      title="Mover para cima"
                      className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E0447C] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === tarefas.length - 1}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      title="Mover para baixo"
                      className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E0447C] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditTask(task)}
                      title="Editar tarefa"
                      className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#3B2B2B] hover:bg-white transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTaskId(task.id)}
                      title="Excluir tarefa"
                      className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E5484D] hover:bg-white transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL DE TAREFA (CRIAR/EDITAR) ================= */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#F2A65A]/20 shadow-2xl relative">
            <button
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-6 right-6 p-1 rounded-full text-[#8A6F6F] hover:bg-[#FFF3E8] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-display font-bold text-[#3B2B2B] mb-1">
              {editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
            </h2>
            <p className="text-xs text-[#8A6F6F] mb-6">Checklist para o processo {processo.nome}</p>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="titulo"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Título da Tarefa *
                </Label>
                <Input
                  id="titulo"
                  required
                  placeholder="Ex.: Ligar forno industrial a 180°C"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="desc"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Instruções de Execução (opcional)
                </Label>
                <Textarea
                  id="desc"
                  rows={3}
                  placeholder="Detalhes de como o colaborador deve realizar o procedimento..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] resize-none"
                />
              </div>

              {/* Item crítico */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF3F3] border border-[#E5484D]/20">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#E5484D]" /> Item Crítico
                  </p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    O que não pode falhar — destaque no celular e alerta na dashboard
                  </p>
                </div>
                <Switch checked={critica} onCheckedChange={setCritica} />
              </div>

              {/* Tipo de registro exigido */}
              <div className="p-3 rounded-xl bg-[#FFF9F2] border border-[#F2A65A]/20 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-[#E0447C]" /> Registro Exigido
                  </p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    Sem o registro exigido, o item não conta como concluído
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: 'nenhum', label: 'Nenhum', icon: CheckCircle },
                      { v: 'medicao', label: 'Medição', icon: Thermometer },
                      { v: 'texto', label: 'Texto', icon: Type },
                    ] as const
                  ).map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTipoRegistro(v)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        tipoRegistro === v
                          ? 'bg-[#E0447C] border-[#E0447C] text-white shadow-sm'
                          : 'bg-white border-[#F2A65A]/30 text-[#8A6F6F] hover:border-[#E0447C]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {tipoRegistro === 'medicao' && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-[#3B2B2B]">Valor-alvo</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="5"
                        value={medicaoAlvo}
                        onChange={(e) => setMedicaoAlvo(e.target.value)}
                        className="h-10 rounded-xl bg-white border-[#F2A65A]/30 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-[#3B2B2B]">Máximo</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="5"
                        value={medicaoMax}
                        onChange={(e) => setMedicaoMax(e.target.value)}
                        className="h-10 rounded-xl bg-white border-[#F2A65A]/30 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-[#3B2B2B]">Unidade</Label>
                      <Input
                        placeholder="°C"
                        value={medicaoUnidade}
                        onChange={(e) => setMedicaoUnidade(e.target.value)}
                        className="h-10 rounded-xl bg-white border-[#F2A65A]/30 text-sm"
                      />
                    </div>
                  </div>
                )}

                {tipoRegistro === 'texto' && (
                  <p className="text-[11px] text-[#8A6F6F]">
                    O colaborador deverá escrever uma observação obrigatória ao concluir.
                  </p>
                )}
              </div>

              {/* Evidência: foto, vídeo ou nenhum registro */}
              <div className="p-3 rounded-xl bg-[#FFF9F2] border border-[#F2A65A]/20 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#E0447C]" /> Evidência
                  </p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    Foto ou vídeo anexado pelo colaborador ao concluir (câmera ou galeria)
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: 'nenhuma', label: 'Sem foto e vídeo', icon: X },
                      { v: 'foto_obrigatoria', label: 'Foto obrigatória', icon: Camera },
                      { v: 'foto_opcional', label: 'Foto opcional', icon: Upload },
                    ] as const
                  ).map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEvidencia(v)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        evidencia === v
                          ? 'bg-[#E0447C] border-[#E0447C] text-white shadow-sm'
                          : 'bg-white border-[#F2A65A]/30 text-[#8A6F6F] hover:border-[#E0447C]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: 'video_obrigatorio', label: 'Vídeo obrigatório', icon: Video },
                      { v: 'video_opcional', label: 'Vídeo opcional', icon: Video },
                    ] as const
                  ).map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEvidencia(v)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        evidencia === v
                          ? 'bg-[#3B7A9C] border-[#3B7A9C] text-white shadow-sm'
                          : 'bg-white border-[#3B7A9C]/30 text-[#8A6F6F] hover:border-[#3B7A9C]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                {(evidencia === 'foto_obrigatoria' || evidencia === 'video_obrigatorio') && (
                  <p className="text-[11px] text-[#8A6F6F]">
                    O item só poderá ser concluído com a evidência anexada
                    {evidencia === 'video_obrigatorio' ? ' (vídeo de até 30 segundos)' : ''}.
                  </p>
                )}
                {(evidencia === 'foto_opcional' || evidencia === 'video_opcional') && (
                  <p className="text-[11px] text-[#8A6F6F]">
                    A evidência é incentivada, mas o item pode ser concluído sem ela
                    {evidencia === 'video_opcional' ? ' (vídeo de até 30 segundos)' : ''}.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F2] border border-[#F2A65A]/20">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B]">Tarefa Ativa</p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    Desative temporariamente sem precisar apagar
                  </p>
                </div>
                <Switch checked={ativa} onCheckedChange={setAtiva} />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="rounded-full border-[#F2A65A]/40 text-[#3B2B2B] text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold px-6"
                >
                  {savingTask ? 'Salvando...' : 'Salvar Tarefa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CONFIRMAÇÃO EXCLUIR PROCESSO ================= */}
      {confirmDeleteProcesso && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#E5484D]/30 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#E5484D]/15 text-[#E5484D] mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-[#3B2B2B]">Excluir Processo?</h3>
            <p className="text-xs text-[#8A6F6F] mt-2">
              Todas as tarefas deste processo e suas atribuições serão removidas. Esta ação não pode
              ser desfeita.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteProcesso(false)}
                className="rounded-full border-stone-300 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteProcesso}
                className="rounded-full bg-[#E5484D] hover:bg-[#C9383D] text-white text-xs font-bold"
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CONFIRMAÇÃO EXCLUIR TAREFA ================= */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#E5484D]/30 shadow-2xl text-center">
            <h3 className="text-base font-display font-bold text-[#3B2B2B]">
              Remover esta tarefa?
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-1">
              A tarefa deixará de existir para este checklist.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingTaskId(null)}
                className="rounded-full border-stone-300 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleDeleteTask(deletingTaskId)}
                className="rounded-full bg-[#E5484D] hover:bg-[#C9383D] text-white text-xs font-bold"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
