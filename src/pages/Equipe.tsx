import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { usersService } from '@/services/users'
import { atribuicoesService } from '@/services/atribuicoes'
import type { UserRecord, UserRole } from '@/types'
import { LOCAIS, LOCAL_LABELS, localLabel, type LocalValue } from '@/lib/locais'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ShieldCheck, UserCheck, AlertTriangle, MapPin, Pencil } from 'lucide-react'

export default function Equipe() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [stats, setStats] = useState<
    Record<string, { total: number; concluidas: number; taxa: number }>
  >({})
  const [loading, setLoading] = useState(true)

  // Modal para confirmação de troca de perfil
  const [confirmModal, setConfirmModal] = useState<{
    user: UserRecord
    newRole: UserRole
  } | null>(null)
  const [changing, setChanging] = useState(false)

  // Modal de edição de local/supervisor
  const [editModal, setEditModal] = useState<{
    user: UserRecord
    local: string
    supervisor: string
  } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const loadEquipe = async () => {
    setLoading(true)
    try {
      const list = await usersService.list()
      setUsers(list)

      // Calcular taxa de conclusão nos últimos 30 dias por pessoa
      const now = new Date()
      const past30 = new Date()
      past30.setDate(now.getDate() - 30)
      const startStr = past30.toISOString().split('T')[0]
      const endStr = now.toISOString().split('T')[0]

      const pastTasks = await atribuicoesService.listRange(startStr, endStr)
      const metricsMap: Record<string, { total: number; concluidas: number; taxa: number }> = {}

      list.forEach((u) => {
        metricsMap[u.id] = { total: 0, concluidas: 0, taxa: 0 }
      })

      pastTasks.forEach((t) => {
        if (!metricsMap[t.colaborador]) {
          metricsMap[t.colaborador] = { total: 0, concluidas: 0, taxa: 0 }
        }
        metricsMap[t.colaborador].total += 1
        if (t.status === 'concluida') {
          metricsMap[t.colaborador].concluidas += 1
        }
      })

      Object.keys(metricsMap).forEach((id) => {
        const item = metricsMap[id]
        item.taxa = item.total > 0 ? Math.round((item.concluidas / item.total) * 100) : 0
      })

      setStats(metricsMap)
    } catch (err) {
      toast.error('Erro ao carregar lista de equipe.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEquipe()
  }, [])

  const handleConfirmRoleChange = async () => {
    if (!confirmModal) return
    setChanging(true)
    try {
      await usersService.updateRole(confirmModal.user.id, confirmModal.newRole)
      toast.success(
        `Função de ${confirmModal.user.name || confirmModal.user.email} alterada para ${confirmModal.newRole}!`,
      )
      setConfirmModal(null)
      loadEquipe()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Não foi possível alterar a função.')
    } finally {
      setChanging(false)
    }
  }

  const openEditModal = (colab: UserRecord) => {
    setEditModal({
      user: colab,
      local: colab.local || '',
      supervisor: colab.supervisor || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editModal) return
    setSavingEdit(true)
    try {
      const updated = await usersService.updateLocalSupervisor(editModal.user.id, {
        local: (editModal.local || '') as LocalValue | '',
        supervisor: editModal.supervisor || '',
      })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      toast.success('Dados do colaborador atualizados!')
      setEditModal(null)
      loadEquipe()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Não foi possível salvar os dados.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Supervisores possíveis: gerentes do mesmo local do colaborador em edição
  const supervisoresPossiveis = editModal
    ? users.filter(
        (u) =>
          u.role === 'gerente' &&
          u.id !== editModal.user.id &&
          (!editModal.local || !u.local || u.local === editModal.local),
      )
    : []

  const nomeSupervisor = (supId?: string) => {
    if (!supId) return null
    const sup = users.find((u) => u.id === supId)
    return sup ? sup.name || sup.email : null
  }

  return (
    <MainLayout title="Gestão da Equipe">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
        <div className="pb-5 border-b border-[#F2A65A]/15 mb-4">
          <h2 className="font-display font-bold text-xl text-[#3B2B2B]">
            Colaboradores Cadastrados
          </h2>
          <p className="text-xs text-[#8A6F6F] mt-1">
            Gerencie local, supervisor e permissões; veja o desempenho operacional dos últimos 30
            dias de cada membro.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-[#E0447C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="divide-y divide-[#F2A65A]/10">
            {users.map((colab) => {
              const isGerente = colab.role === 'gerente'
              const userStat = stats[colab.id] || { total: 0, concluidas: 0, taxa: 0 }

              return (
                <div
                  key={colab.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar className="w-12 h-12 border-2 border-[#E0447C]/30 shadow-xs">
                      <AvatarImage
                        src={colab.avatar ? usersService.getFileUrl(colab, colab.avatar) : ''}
                      />
                      <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-sm">
                        {colab.name ? colab.name.slice(0, 2).toUpperCase() : 'TC'}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display font-bold text-[#3B2B2B] text-base">
                          {colab.name || 'Sem nome'}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isGerente
                              ? 'bg-[#E0447C]/15 text-[#E0447C]'
                              : 'bg-[#F2A65A]/20 text-[#C96B16]'
                          }`}
                        >
                          {colab.role}
                        </span>
                        {colab.local && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF3E8] text-[#C96B16] border border-[#F2A65A]/30 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {localLabel(colab.local)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8A6F6F] mt-0.5">{colab.email}</p>
                      <p className="text-[11px] text-[#8A6F6F] mt-0.5">
                        {nomeSupervisor(colab.supervisor)
                          ? `Supervisor: ${nomeSupervisor(colab.supervisor)}`
                          : 'Sem supervisor definido'}
                      </p>
                    </div>
                  </div>

                  {/* Estatísticas e Ações */}
                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-[#8A6F6F]">Últimos 30 dias</p>
                      <p className="text-sm font-bold text-[#3B2B2B]">
                        {userStat.concluidas}/{userStat.total}{' '}
                        <span className="text-[#3FA372]">({userStat.taxa}%)</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(colab)}
                        className="rounded-full border-[#F2A65A]/40 text-[#3B2B2B] hover:bg-[#FFF3E8] text-xs font-bold"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1 text-[#F2A65A]" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmModal({
                            user: colab,
                            newRole: isGerente ? 'colaborador' : 'gerente',
                          })
                        }
                        className="rounded-full border-[#F2A65A]/40 text-[#3B2B2B] hover:bg-[#FFF3E8] text-xs font-bold"
                      >
                        {isGerente ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 mr-1 text-[#F2A65A]" /> Mudar p/
                            Colaborador
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#E0447C]" /> Promover a
                            Gerente
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL EDIÇÃO LOCAL/SUPERVISOR ================= */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#F2A65A]/20 shadow-2xl">
            <h3 className="text-lg font-display font-bold text-[#3B2B2B]">
              Editar {editModal.user.name || 'colaborador'}
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-1 mb-5">
              Defina o local de operação e o supervisor responsável (usados nos alertas de tarefas
              não concluídas).
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
                  Local
                </label>
                <Select
                  value={editModal.local}
                  onValueChange={(val) =>
                    setEditModal((m) => (m ? { ...m, local: val, supervisor: '' } : m))
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]">
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCAIS.map((l: LocalValue) => (
                      <SelectItem key={l} value={l}>
                        {LOCAL_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
                  Supervisor
                </label>
                <Select
                  value={editModal.supervisor}
                  onValueChange={(val) => setEditModal((m) => (m ? { ...m, supervisor: val } : m))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]">
                    <SelectValue
                      placeholder={
                        supervisoresPossiveis.length
                          ? 'Selecione o supervisor'
                          : 'Nenhum gerente disponível'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisoresPossiveis.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#8A6F6F]">
                  Gerentes do mesmo local aparecem como opção.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModal(null)}
                className="rounded-full border-stone-300 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={savingEdit || !editModal.local}
                onClick={handleSaveEdit}
                className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CONFIRMAÇÃO TROCA DE ROLE ================= */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#F2A65A]/20 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFF3E8] text-[#E0447C] mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-[#3B2B2B]">
              Alterar Perfil de Acesso
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-2 leading-relaxed">
              Deseja alterar a função de{' '}
              <strong>{confirmModal.user.name || confirmModal.user.email}</strong> para{' '}
              <strong className="text-[#E0447C] uppercase">{confirmModal.newRole}</strong>?
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal(null)}
                className="rounded-full border-stone-300 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={changing}
                onClick={handleConfirmRoleChange}
                className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold"
              >
                {changing ? 'Salvando...' : 'Confirmar Alteração'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
