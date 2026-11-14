import React, { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { atribuicoesService } from '@/services/atribuicoes'
import { usersService } from '@/services/users'
import { processosService } from '@/services/processos'
import type { AtribuicaoRecord, UserRecord, ProcessoRecord } from '@/types'
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
  Download,
  Filter,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  MinusCircle,
  Camera,
  X,
  Maximize2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts'

export default function Relatorios() {
  // Filtros
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14) // últimos 15 dias
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [colaboradorId, setColaboradorId] = useState('todos')
  const [processoId, setProcessoId] = useState('todos')
  const [status, setStatus] = useState('todos')

  // Dados
  const [colaboradores, setColaboradores] = useState<UserRecord[]>([])
  const [processos, setProcessos] = useState<ProcessoRecord[]>([])
  const [registros, setRegistros] = useState<AtribuicaoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Lightbox da foto
  const [lightboxFotoUrl, setLightboxFotoUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [uList, pList] = await Promise.all([usersService.list(), processosService.list()])
        setColaboradores(uList)
        setProcessos(pList)
      } catch (err) {
        toast.error('Erro ao carregar filtros.')
      }
    }
    loadFilters()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await atribuicoesService.listRange(dataInicio, dataFim, {
        colaboradorId: colaboradorId === 'todos' ? undefined : colaboradorId,
        status: status === 'todos' ? undefined : status,
      })

      // Filtro local adicional de processo (já que PocketBase filter em relação aninhada pode variar)
      const filtered =
        processoId === 'todos'
          ? data
          : data.filter((item) => item.expand?.tarefa?.processo === processoId)

      setRegistros(filtered)
    } catch (err) {
      toast.error('Erro ao carregar histórico.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dataInicio, dataFim, colaboradorId, processoId, status])

  // Gráfico 1: Conclusões por Dia
  const chartPorDia = useMemo(() => {
    const map = new Map<string, { data: string; concluidas: number; pendentes: number }>()
    registros.forEach((r) => {
      const day = r.data.split('T')[0]
      if (!map.has(day)) {
        map.set(day, { data: day.slice(5), concluidas: 0, pendentes: 0 })
      }
      if (r.status === 'concluida') {
        map.get(day)!.concluidas += 1
      } else if (r.status === 'pendente') {
        map.get(day)!.pendentes += 1
      }
    })

    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data))
  }, [registros])

  // Gráfico 2: Conclusões por Colaborador
  const chartPorColaborador = useMemo(() => {
    const map = new Map<string, { nome: string; concluidas: number; total: number }>()
    registros.forEach((r) => {
      const nome = r.expand?.colaborador?.name || r.expand?.colaborador?.email || 'Desconhecido'
      if (!map.has(nome)) {
        map.set(nome, { nome, concluidas: 0, total: 0 })
      }
      const entry = map.get(nome)!
      entry.total += 1
      if (r.status === 'concluida') entry.concluidas += 1
    })

    return Array.from(map.values())
  }, [registros])

  // Gráfico 3: Conclusões por Processo
  const chartPorProcesso = useMemo(() => {
    const map = new Map<string, { nome: string; concluidas: number; total: number }>()
    registros.forEach((r) => {
      const nome = r.expand?.tarefa?.expand?.processo?.nome || 'Sem processo'
      if (!map.has(nome)) {
        map.set(nome, { nome, concluidas: 0, total: 0 })
      }
      const entry = map.get(nome)!
      entry.total += 1
      if (r.status === 'concluida') entry.concluidas += 1
    })

    return Array.from(map.values())
  }, [registros])

  // Exportar CSV
  const handleExportCSV = () => {
    if (registros.length === 0) {
      toast.warning('Nenhum dado para exportar.')
      return
    }

    const headers = [
      'Data',
      'Colaborador',
      'Email',
      'Processo',
      'Area',
      'Tarefa',
      'Status',
      'ConcluidaEm',
      'Observacao',
      'PossuiFoto',
    ]

    const rows = registros.map((r) => {
      const cleanDate = r.data.split('T')[0]
      const colabName = r.expand?.colaborador?.name || ''
      const colabEmail = r.expand?.colaborador?.email || ''
      const procName = r.expand?.tarefa?.expand?.processo?.nome || ''
      const procArea = r.expand?.tarefa?.expand?.processo?.area || ''
      const taskTitle = r.expand?.tarefa?.titulo || ''
      const concluidaEm = r.concluida_em ? new Date(r.concluida_em).toLocaleString('pt-BR') : ''
      const obs = (r.observacao || '').replace(/"/g, '""')
      const temFoto = r.foto ? 'Sim' : 'Nao'

      return [
        `"${cleanDate}"`,
        `"${colabName}"`,
        `"${colabEmail}"`,
        `"${procName}"`,
        `"${procArea}"`,
        `"${taskTitle}"`,
        `"${r.status}"`,
        `"${concluidaEm}"`,
        `"${obs}"`,
        `"${temFoto}"`,
      ].join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `tati-check-relatorio-${dataInicio}-a-${dataFim}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Relatório CSV exportado com sucesso!')
  }

  return (
    <MainLayout
      title="Relatórios e Indicadores"
      actions={
        <Button
          onClick={handleExportCSV}
          className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-xs shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4 mr-1.5" /> Exportar CSV
        </Button>
      }
    >
      {/* ================= BARRA DE FILTROS ================= */}
      <div className="bg-white p-5 rounded-3xl border border-[#F2A65A]/20 shadow-xs mb-8">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#8A6F6F]">
          <Filter className="w-4 h-4 text-[#E0447C]" /> Filtros de Pesquisa
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-[11px] font-bold text-[#3B2B2B]">Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs font-semibold"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-[#3B2B2B]">Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs font-semibold"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-[#3B2B2B]">Colaborador</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs font-semibold">
                <SelectValue placeholder="Colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-[#3B2B2B]">Processo</Label>
            <Select value={processoId} onValueChange={setProcessoId}>
              <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs font-semibold">
                <SelectValue placeholder="Processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-[#3B2B2B]">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="nao_aplicavel">Não aplicável</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ================= GRÁFICOS COLORIDOS COM PALETA ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico 1: Conclusões por Dia */}
        <div className="bg-white p-6 rounded-3xl border border-[#F2A65A]/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-[#3B2B2B]">
              Conclusões por Dia no Período
            </h3>
            <span className="text-xs font-semibold text-[#3FA372]">● Concluídas</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F2A65A"
                  strokeOpacity={0.15}
                />
                <XAxis dataKey="data" stroke="#8A6F6F" fontSize={11} tickLine={false} />
                <YAxis stroke="#8A6F6F" fontSize={11} tickLine={false} allowDecimals={false} />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#3B2B2B] text-[#FFF9F2] p-2 rounded-xl text-xs shadow-md">
                          <p className="font-bold">Dia {label}</p>
                          <p className="text-[#3FA372]">Concluídas: {payload[0]?.value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="concluidas" fill="#3FA372" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Desempenho por Colaborador */}
        <div className="bg-white p-6 rounded-3xl border border-[#F2A65A]/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-[#3B2B2B]">
              Tarefas Concluídas por Colaborador
            </h3>
            <span className="text-xs font-semibold text-[#E0447C]">● Concluídas</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartPorColaborador}
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#F2A65A"
                  strokeOpacity={0.15}
                />
                <XAxis
                  type="number"
                  stroke="#8A6F6F"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  stroke="#8A6F6F"
                  fontSize={11}
                  tickLine={false}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-[#3B2B2B] text-[#FFF9F2] p-2 rounded-xl text-xs shadow-md">
                          <p className="font-bold">{d.nome}</p>
                          <p className="text-[#3FA372]">Concluídas: {d.concluidas}</p>
                          <p className="text-[#8A6F6F]">Total: {d.total}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="concluidas" fill="#E0447C" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ================= TABELA DE DETALHE COMPLETO ================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#F2A65A]/15 mb-2">
          <h3 className="font-display font-bold text-lg text-[#3B2B2B]">
            Histórico Detalhado ({registros.length} registros)
          </h3>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-[#E0447C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : registros.length === 0 ? (
          <div className="py-12 text-center text-[#8A6F6F]">
            <p className="text-sm">Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F2A65A]/20 text-[#8A6F6F] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Colaborador</th>
                  <th className="py-3 px-3">Tarefa / Checklist</th>
                  <th className="py-3 px-3">Processo</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Conclusão</th>
                  <th className="py-3 px-3">Foto</th>
                  <th className="py-3 px-3">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2A65A]/10">
                {registros.map((item) => {
                  const colab = item.expand?.colaborador
                  const tarefa = item.expand?.tarefa
                  const processo = tarefa?.expand?.processo
                  const cleanDate = item.data.split('T')[0]
                  const isConcluida = item.status === 'concluida'
                  const isNaoAplicavel = item.status === 'nao_aplicavel'

                  const fotoUrl = item.foto ? usersService.getFileUrl(item, item.foto) : null

                  return (
                    <tr key={item.id} className="hover:bg-[#FFF9F2]/50 transition">
                      <td className="py-3 px-3 font-semibold text-[#3B2B2B] whitespace-nowrap">
                        {new Date(cleanDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#3B2B2B]">
                          {colab?.name || colab?.email}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[200px]">
                        <p className="font-semibold text-[#3B2B2B] truncate">{tarefa?.titulo}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {processo?.area && <AreaBadge area={processo.area} size="sm" />}
                          <span className="text-[#8A6F6F] truncate">{processo?.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConcluida
                              ? 'bg-[#EDF8F1] text-[#2D7A51]'
                              : isNaoAplicavel
                                ? 'bg-stone-100 text-stone-600'
                                : 'bg-[#FFF9E6] text-[#9E7314]'
                          }`}
                        >
                          {isConcluida && <CheckCircle2 className="w-3 h-3" />}
                          {isNaoAplicavel && <MinusCircle className="w-3 h-3" />}
                          {isConcluida
                            ? 'Concluída'
                            : isNaoAplicavel
                              ? 'Não aplicável'
                              : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#8A6F6F] whitespace-nowrap">
                        {item.concluida_em
                          ? new Date(item.concluida_em).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-3">
                        {fotoUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightboxFotoUrl(fotoUrl)}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-[#E0447C]/40 hover:scale-105 transition block cursor-pointer"
                          >
                            <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td
                        className="py-3 px-3 max-w-[180px] text-[#8A6F6F] truncate"
                        title={item.observacao}
                      >
                        {item.observacao || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= LIGHTBOX PARA FOTO ================= */}
      {lightboxFotoUrl && (
        <div
          onClick={() => setLightboxFotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh] p-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setLightboxFotoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxFotoUrl}
              alt="Evidência ampliada"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </MainLayout>
  )
}
