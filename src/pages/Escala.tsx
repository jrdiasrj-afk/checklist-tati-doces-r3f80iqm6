import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { atribuicoesService } from '@/services/atribuicoes'
import { processosService } from '@/services/processos'
import { usersService } from '@/services/users'
import type { AtribuicaoRecord, ProcessoRecord, UserRecord } from '@/types'
import { AreaBadge } from '@/components/AreaBadge'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  CalendarDays,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Clock,
  MinusCircle,
  Sparkles,
  Info,
} from 'lucide-react'

export default function Escala() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const [colaboradores, setColaboradores] = useState<UserRecord[]>([])
  const [processos, setProcessos] = useState<ProcessoRecord[]>([])
  const [atribuicoesDoDia, setAtribuicoesDoDia] = useState<AtribuicaoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Form de Escala Rápida
  const [targetColaborador, setTargetColaborador] = useState<string>('')
  const [targetProcesso, setTargetProcesso] = useState<string>('')
  const [submittingBulk, setSubmittingBulk] = useState(false)

  // Modal para remover atribuição individual
  const [deletingAtribId, setDeletingAtribId] = useState<string | null>(null)

  const loadInitialData = async () => {
    try {
      const [usersList, procList] = await Promise.all([
        usersService.list(),
        processosService.list({ ativo: true }),
      ])
      setColaboradores(usersList)
      setProcessos(procList)
      if (usersList.length > 0) setTargetColaborador(usersList[0].id)
      if (procList.length > 0) setTargetProcesso(procList[0].id)
    } catch (err) {
      toast.error('Erro ao carregar colaboradores e processos.')
    }
  }

  const loadAtribuicoes = async () => {
    setLoading(true)
    try {
      const list = await atribuicoesService.listByDate(selectedDate)
      setAtribuicoesDoDia(list)
    } catch (err) {
      toast.error('Erro ao carregar escala do dia.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadAtribuicoes()
  }, [selectedDate])

  const handleEscalarBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetColaborador || !targetProcesso || !selectedDate) {
      toast.error('Selecione o colaborador e o processo.')
      return
    }

    setSubmittingBulk(true)
    try {
      const res = await atribuicoesService.bulkAssign({
        processo_id: targetProcesso,
        colaborador_id: targetColaborador,
        datas: [selectedDate],
      })

      if (res.criadas > 0) {
        toast.success(`${res.criadas} tarefa(s) atribuída(s) com sucesso para o dia! 🧁`)
      } else if (res.ignoradas > 0) {
        toast.info('As tarefas deste processo já estavam todas escaladas para esta pessoa hoje.')
      } else {
        toast.warning('O processo selecionado não continha tarefas ativas.')
      }
      loadAtribuicoes()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Falha ao escalar processo.')
    } finally {
      setSubmittingBulk(false)
    }
  }

  const handleDeleteAtribuicao = async (id: string) => {
    try {
      await atribuicoesService.delete(id)
      toast.success('Atribuição removida.')
      setDeletingAtribId(null)
      loadAtribuicoes()
    } catch (err) {
      toast.error('Erro ao remover atribuição.')
    }
  }

  return (
    <MainLayout title="Escala Diária de Tarefas">
      {/* ================= CARD SUPERIOR: ESCALAR PROCESSO ================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E0447C] to-[#F2A65A] flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-[#3B2B2B]">
              Escalar Checklist para o Dia
            </h2>
            <p className="text-xs text-[#8A6F6F]">
              Crie todas as tarefas ativas do processo de uma só vez para o colaborador selecionado.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleEscalarBulk}
          className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mt-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
              Data da Execução *
            </Label>
            <div className="relative">
              <Input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
              Colaborador *
            </Label>
            <Select value={targetColaborador} onValueChange={setTargetColaborador}>
              <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold">
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.email} ({c.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
              Processo / Rotina *
            </Label>
            <Select value={targetProcesso} onValueChange={setTargetProcesso}>
              <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold">
                <SelectValue placeholder="Selecione o processo" />
              </SelectTrigger>
              <SelectContent>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.area})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              type="submit"
              disabled={submittingBulk}
              className="w-full h-11 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {submittingBulk ? 'Escalando...' : 'Escalar para o Dia'}
            </Button>
          </div>
        </form>
      </div>

      {/* ================= TABELA / LISTA: ATRIBUIÇÕES DO DIA ================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-[#F2A65A]/15">
          <div>
            <h3 className="text-lg font-display font-bold text-[#3B2B2B] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#E0447C]" />
              Atribuições de{' '}
              <span className="text-[#E0447C]">
                {new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-0.5">
              Total de {atribuicoesDoDia.length} tarefa(s) agendada(s) para esta data
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-[#E0447C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : atribuicoesDoDia.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-5xl block mb-2">🧁</span>
            <h4 className="text-base font-display font-bold text-[#3B2B2B]">
              Nenhuma tarefa escalada para hoje
            </h4>
            <p className="text-xs text-[#8A6F6F] mt-1 max-w-sm mx-auto">
              Utilize o formulário acima para atribuir checklists de processos para os colaboradores
              da equipe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F2A65A]/20 text-[#8A6F6F] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Colaborador</th>
                  <th className="py-3 px-3">Tarefa / Checklist</th>
                  <th className="py-3 px-3">Processo & Área</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2A65A]/10">
                {atribuicoesDoDia.map((item) => {
                  const colab = item.expand?.colaborador
                  const tarefa = item.expand?.tarefa
                  const processo = tarefa?.expand?.processo

                  const isConcluida = item.status === 'concluida'
                  const isPendente = item.status === 'pendente'
                  const isNaoAplicavel = item.status === 'nao_aplicavel'

                  return (
                    <tr key={item.id} className="hover:bg-[#FFF9F2]/60 transition">
                      {/* Colaborador */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 border border-[#E0447C]/30 shrink-0">
                            <AvatarImage
                              src={
                                colab?.avatar ? usersService.getFileUrl(colab, colab.avatar) : ''
                              }
                            />
                            <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-[10px]">
                              {colab?.name ? colab.name.slice(0, 2).toUpperCase() : 'CO'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-[#3B2B2B] truncate">
                              {colab?.name || colab?.email}
                            </p>
                            <p className="text-[10px] text-[#8A6F6F] truncate">{colab?.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tarefa */}
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-[#3B2B2B]">{tarefa?.titulo || 'Tarefa'}</p>
                        {tarefa?.tipo_registro === 'video' && tarefa?.evidencia_obrigatoria && (
                          <span className="text-[10px] text-[#3B7A9C] font-bold block mt-0.5">
                            * Exige vídeo
                          </span>
                        )}
                        {tarefa?.tipo_registro === 'video' && !tarefa?.evidencia_obrigatoria && (
                          <span className="text-[10px] text-[#3B7A9C] font-bold block mt-0.5">
                            Vídeo opcional
                          </span>
                        )}
                        {tarefa?.tipo_registro === 'foto' && tarefa?.evidencia_obrigatoria && (
                          <span className="text-[10px] text-[#E0447C] font-bold block mt-0.5">
                            * Exige foto
                          </span>
                        )}
                        {tarefa?.tipo_registro === 'foto' && !tarefa?.evidencia_obrigatoria && (
                          <span className="text-[10px] text-[#2D7A51] font-bold block mt-0.5">
                            Foto opcional
                          </span>
                        )}
                      </td>

                      {/* Processo & Área */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          {processo?.area && <AreaBadge area={processo.area} size="sm" />}
                          <span className="font-semibold text-[#8A6F6F] truncate">
                            {processo?.nome}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            isConcluida
                              ? 'bg-[#EDF8F1] text-[#2D7A51]'
                              : isNaoAplicavel
                                ? 'bg-stone-100 text-stone-600'
                                : 'bg-[#FFF9E6] text-[#9E7314]'
                          }`}
                        >
                          {isConcluida && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {isPendente && <Clock className="w-3.5 h-3.5" />}
                          {isNaoAplicavel && <MinusCircle className="w-3.5 h-3.5" />}
                          {isConcluida
                            ? 'Concluída'
                            : isNaoAplicavel
                              ? 'Não aplicável'
                              : 'Pendente'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletingAtribId(item.id)}
                          title="Remover atribuição"
                          className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E5484D] hover:bg-white transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL EXCLUSÃO ATRIBUIÇÃO ================= */}
      {deletingAtribId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#E5484D]/30 shadow-2xl text-center">
            <h3 className="text-base font-display font-bold text-[#3B2B2B]">
              Remover esta atribuição?
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-1">
              A tarefa deixará de aparecer na lista do colaborador para este dia.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingAtribId(null)}
                className="rounded-full border-stone-300 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleDeleteAtribuicao(deletingAtribId)}
                className="rounded-full bg-[#E5484D] hover:bg-[#C9383D] text-white text-xs font-bold"
              >
                Confirmar Remoção
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
