import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { usersService } from '@/services/users'
import { atribuicoesService } from '@/services/atribuicoes'
import type { UserRecord, UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react'

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

  return (
    <MainLayout title="Gestão da Equipe">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
        <div className="pb-5 border-b border-[#F2A65A]/15 mb-4">
          <h2 className="font-display font-bold text-xl text-[#3B2B2B]">
            Colaboradores Cadastrados
          </h2>
          <p className="text-xs text-[#8A6F6F] mt-1">
            Gerencie as permissões e veja o desempenho operacional dos últimos 30 dias de cada
            membro.
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
                      <div className="flex items-center gap-2">
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
                      </div>
                      <p className="text-xs text-[#8A6F6F] mt-0.5">{colab.email}</p>
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
              )
            })}
          </div>
        )}
      </div>

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
