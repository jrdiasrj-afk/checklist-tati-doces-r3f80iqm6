import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import { atribuicoesService } from '@/services/atribuicoes'
import { usersService } from '@/services/users'
import type { AtribuicaoRecord } from '@/types'
import { AreaBadge } from '@/components/AreaBadge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle2, Clock, MinusCircle, Camera, Calendar, X } from 'lucide-react'

export default function Historico() {
  const { user } = useAuth()
  const [diasFiltro, setDiasFiltro] = useState<7 | 30>(7)
  const [historico, setHistorico] = useState<AtribuicaoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxFotoUrl, setLightboxFotoUrl] = useState<string | null>(null)

  const loadHistorico = async () => {
    if (!user) return
    setLoading(true)
    try {
      const now = new Date()
      const past = new Date()
      past.setDate(now.getDate() - diasFiltro)
      const startStr = past.toISOString().split('T')[0]
      const endStr = now.toISOString().split('T')[0]

      const data = await atribuicoesService.listRange(startStr, endStr, {
        colaboradorId: user.id,
      })
      setHistorico(data)
    } catch (err) {
      toast.error('Erro ao carregar histórico.')
    } finally {
      setLoading(false)
    }
  }

  // Dependemos apenas da IDENTIDADE do usuário (user?.id) — o objeto `user`
  // mudava de referência a cada evento do authStore e refazia o fetch em loop.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    loadHistorico()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, diasFiltro])

  // Agrupamento por dia
  const groupedByDay = React.useMemo(() => {
    const map = new Map<string, AtribuicaoRecord[]>()
    historico.forEach((item) => {
      const day = item.data.split('T')[0]
      if (!map.has(day)) {
        map.set(day, [])
      }
      map.get(day)!.push(item)
    })

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [historico])

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header do Histórico */}
        <div className="bg-white rounded-3xl p-6 border border-[#F2A65A]/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-extrabold text-[#3B2B2B]">Meu Histórico</h2>
            <p className="text-xs text-[#8A6F6F] mt-1">
              Registro das suas atividades concluídas na confeitaria.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#FFF9F2] p-1 rounded-full border border-[#F2A65A]/20">
            <button
              type="button"
              onClick={() => setDiasFiltro(7)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                diasFiltro === 7 ? 'bg-[#E0447C] text-white shadow-xs' : 'text-[#8A6F6F]'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              onClick={() => setDiasFiltro(30)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                diasFiltro === 30 ? 'bg-[#E0447C] text-white shadow-xs' : 'text-[#8A6F6F]'
              }`}
            >
              Últimos 30 dias
            </button>
          </div>
        </div>

        {/* Lista de Dias */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 rounded-3xl bg-white animate-pulse border border-[#F2A65A]/20"
              />
            ))}
          </div>
        ) : groupedByDay.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#F2A65A]/20 shadow-xs">
            <span className="text-5xl block mb-2">🧁</span>
            <h3 className="font-display font-bold text-base text-[#3B2B2B]">
              Nenhum checklist registrado
            </h3>
            <p className="text-xs text-[#8A6F6F] mt-1">
              Suas tarefas concluídas dos últimos {diasFiltro} dias aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDay.map(([dayStr, items]) => {
              const formattedDate = new Date(dayStr + 'T12:00:00Z').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })

              const concluidasCount = items.filter((i) => i.status === 'concluida').length

              return (
                <div
                  key={dayStr}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F2A65A]/20 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#F2A65A]/15 mb-3">
                    <span className="font-display font-bold text-sm text-[#3B2B2B] capitalize flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#E0447C]" /> {formattedDate}
                    </span>
                    <span className="text-xs font-bold text-[#3FA372]">
                      {concluidasCount}/{items.length} Concluídas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => {
                      const isConcluida = item.status === 'concluida'
                      const isNaoAplicavel = item.status === 'nao_aplicavel'
                      const isPendente = item.status === 'pendente'
                      const tarefa = item.expand?.tarefa
                      const processo = tarefa?.expand?.processo

                      const fotoUrl = item.foto ? usersService.getFileUrl(item, item.foto) : null

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-[#FFF9F2]/50 border border-[#F2A65A]/20 flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="mt-0.5">
                              {isConcluida && <CheckCircle2 className="w-4 h-4 text-[#3FA372]" />}
                              {isPendente && <Clock className="w-4 h-4 text-[#F5B841]" />}
                              {isNaoAplicavel && <MinusCircle className="w-4 h-4 text-[#B8AFA8]" />}
                            </div>

                            <div className="min-w-0">
                              <h4
                                className={`text-xs font-bold ${
                                  isNaoAplicavel ? 'line-through text-stone-400' : 'text-[#3B2B2B]'
                                }`}
                              >
                                {tarefa?.titulo}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                {processo?.area && <AreaBadge area={processo.area} size="sm" />}
                                <span className="text-[11px] text-[#8A6F6F] truncate">
                                  {processo?.nome}
                                </span>
                              </div>

                              {item.observacao && (
                                <p className="text-[11px] text-[#8A6F6F] mt-1.5 italic bg-white p-2 rounded-lg border border-[#F2A65A]/20">
                                  "{item.observacao}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Foto thumbnail */}
                          {fotoUrl && (
                            <button
                              type="button"
                              onClick={() => setLightboxFotoUrl(fotoUrl)}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-[#E0447C]/40 shrink-0 hover:scale-105 transition cursor-pointer"
                            >
                              <img
                                src={fotoUrl}
                                alt="Evidência"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= LIGHTBOX FOTO ================= */}
      {lightboxFotoUrl && (
        <div
          onClick={() => setLightboxFotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-lg max-h-[85vh] p-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setLightboxFotoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxFotoUrl}
              alt="Evidência ampliada"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </MainLayout>
  )
}
