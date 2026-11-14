import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { processosService } from '@/services/processos'
import type { ProcessoRecord, TarefaRecord, AreaProcesso } from '@/types'
import { AreaBadge } from '@/components/AreaBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Camera,
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
  const [evidenciaObrigatoria, setEvidenciaObrigatoria] = useState(false)
  const [ativa, setAtiva] = useState(true)
  const [savingTask, setSavingTask] = useState(false)

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
    } catch (err) {
      toast.error('Erro ao carregar detalhes do processo.')
      navigate('/processos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProcessoAndTarefas()
  }, [id])

  const handleOpenCreateTask = () => {
    setEditingTask(null)
    setTitulo('')
    setDescricao('')
    setEvidenciaObrigatoria(false)
    setAtiva(true)
    setIsTaskModalOpen(true)
  }

  const handleOpenEditTask = (task: TarefaRecord) => {
    setEditingTask(task)
    setTitulo(task.titulo)
    setDescricao(task.descricao || '')
    setEvidenciaObrigatoria(task.evidencia_obrigatoria)
    setAtiva(task.ativa)
    setIsTaskModalOpen(true)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !id) return

    setSavingTask(true)
    try {
      if (editingTask) {
        await processosService.updateTarefa(editingTask.id, {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          evidencia_obrigatoria: evidenciaObrigatoria,
          ativa,
        })
        toast.success('Tarefa atualizada!')
      } else {
        const nextOrder = tarefas.length > 0 ? Math.max(...tarefas.map((t) => t.ordem)) + 1 : 1
        await processosService.createTarefa({
          processo: id,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          ordem: nextOrder,
          evidencia_obrigatoria: evidenciaObrigatoria,
          ativa,
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
                        {task.evidencia_obrigatoria && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E0447C] bg-[#FFF3E8] px-2 py-0.5 rounded-full border border-[#E0447C]/20">
                            <Camera className="w-3 h-3" /> Foto Obrigatória
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

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F2] border border-[#F2A65A]/20">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#E0447C]" /> Exigir Foto de Evidência
                  </p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    O colaborador só pode concluir se tirar uma foto
                  </p>
                </div>
                <Switch checked={evidenciaObrigatoria} onCheckedChange={setEvidenciaObrigatoria} />
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
