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
  FileDown,
  Filter,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  MinusCircle,
  Camera,
  Video,
  X,
  Maximize2,
  Zap,
  Timer,
  Thermometer,
  Grid3X3,
  Trophy,
} from 'lucide-react'
import {
  estaAtrasada,
  minutosAtraso,
  calcularIndicadores,
  type Indicadores,
} from '@/services/indicadores'
import { exportarRelatorioPDF } from '@/services/pdf'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts'

function IndicadorCard({
  icon,
  label,
  valor,
  desc,
  cor,
  destaque = false,
}: {
  icon: React.ReactNode
  label: string
  valor: string
  desc: string
  cor: string
  destaque?: boolean
}) {
  return (
    <div
      className={`bg-white p-5 rounded-2xl shadow-xs ${
        destaque ? 'border-2 border-[#E0447C]/40' : 'border border-[#F2A65A]/20'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: cor }}>
        {icon}
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      </div>
      <h3 className="text-3xl font-display font-extrabold text-[#3B2B2B]">{valor}</h3>
      <p className="text-[11px] text-[#8A6F6F] mt-0.5">{desc}</p>
    </div>
  )
}

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

  // Lightbox da evidência (foto ou vídeo)
  const [lightboxFotoUrl, setLightboxFotoUrl] = useState<string | null>(null)
  const [lightboxEhVideo, setLightboxEhVideo] = useState(false)

  // Aba ativa (Resumo / Matriz / Ranking)
  const [aba, setAba] = useState<'resumo' | 'matriz' | 'ranking'>('resumo')

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

  // Indicadores do período (estilo Koncluí)
  const indicadores = useMemo<Indicadores>(() => calcularIndicadores(registros), [registros])

  // Ranking de colaboradores (Aplicação + Pontualidade -> Score)
  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; itens: AtribuicaoRecord[] }>()
    registros.forEach((r) => {
      const key = r.expand?.colaborador?.id || 'sem-responsavel'
      if (!map.has(key)) {
        map.set(key, {
          nome: r.expand?.colaborador?.name || r.expand?.colaborador?.email || 'Sem responsável',
          itens: [],
        })
      }
      map.get(key)!.itens.push(r)
    })
    return Array.from(map.values())
      .map(({ nome, itens }) => {
        const ind = calcularIndicadores(itens)
        return { nome, ...ind, total: itens.length }
      })
      .sort((a, b) => b.score - a.score)
  }, [registros])

  // Matriz por item: tarefas (linhas) x dias (colunas)
  const matriz = useMemo(() => {
    const dias: string[] = []
    const map = new Map<
      string,
      { titulo: string; processo: string; critica: boolean; celulas: Map<string, AtribuicaoRecord> }
    >()
    registros.forEach((r) => {
      const dia = r.data.split('T')[0]
      if (!dias.includes(dia)) dias.push(dia)
      const tId = r.expand?.tarefa?.id || 'sem-tarefa'
      if (!map.has(tId)) {
        map.set(tId, {
          titulo: r.expand?.tarefa?.titulo || 'Tarefa',
          processo: r.expand?.tarefa?.expand?.processo?.nome || '',
          critica: !!r.expand?.tarefa?.critica,
          celulas: new Map(),
        })
      }
      map.get(tId)!.celulas.set(dia, r)
    })
    return {
      dias: dias.sort(),
      tarefas: Array.from(map.values()),
    }
  }, [registros])

  const celulaMatriz = (r: AtribuicaoRecord) => {
    const atrasada = r.status === 'pendente' && estaAtrasada(r)
    if (r.status === 'concluida') {
      if (r.fora_padrao)
        return (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[#FFF3E0] text-[#B77A0A]"
            title={`Fora do padrão: ${r.medicao_valor ?? ''} (alvo até ${r.expand?.tarefa?.medicao_max ?? r.expand?.tarefa?.medicao_alvo ?? '?'})`}
          >
            <Thermometer className="w-3 h-3" /> {r.medicao_valor ?? 'Fora'}
          </span>
        )
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[#EDF8F1] text-[#2D7A51]"
          title={r.observacao || 'Conforme'}
        >
          <CheckCircle2 className="w-3 h-3" />{' '}
          {r.medicao_valor != null ? `${r.medicao_valor}` : 'OK'}
        </span>
      )
    }
    if (r.status === 'nao_aplicavel')
      return (
        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-stone-100 text-stone-600">
          N/A
        </span>
      )
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${
          atrasada ? 'bg-[#FDECEC] text-[#E5484D]' : 'bg-[#FFF9E6] text-[#9E7314]'
        }`}
        title={
          atrasada
            ? `${r.expand?.colaborador?.name || ''} · ${minutosAtraso(r)} min após o limite`
            : 'Sem registro'
        }
      >
        {atrasada ? <Clock className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {atrasada ? 'Atrasada' : '—'}
      </span>
    )
  }

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
      'HorarioLimite',
      'ConcluidaEm',
      'AtrasoMin',
      'RegistroExigido',
      'ValorMedido',
      'ForaPadrao',
      'Observacao',
      'PossuiFoto',
      'PossuiVideo',
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
      const temVideo = r.video ? 'Sim' : 'Nao'
      const limite = r.horario_limite || (r.expand?.tarefa as any)?.horario_limite || ''
      const atrasoMin =
        r.status === 'concluida' && limite && r.concluida_em
          ? Math.max(
              0,
              Math.round(
                (new Date(r.concluida_em).getTime() -
                  new Date(`${cleanDate}T${limite}:00`).getTime()) /
                  60000,
              ),
            )
          : ''
      const registroExigido = (r.expand?.tarefa as any)?.tipo_registro || 'nenhum'

      return [
        `"${cleanDate}"`,
        `"${colabName}"`,
        `"${colabEmail}"`,
        `"${procName}"`,
        `"${procArea}"`,
        `"${taskTitle}"`,
        `"${r.status}"`,
        `"${limite}"`,
        `"${concluidaEm}"`,
        `"${atrasoMin}"`,
        `"${registroExigido}"`,
        `"${r.medicao_valor ?? ''}"`,
        `"${r.fora_padrao ? 'Sim' : 'Nao'}"`,
        `"${obs}"`,
        `"${temFoto}"`,
        `"${temVideo}"`,
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

  const handleExportPDF = () => {
    exportarRelatorioPDF(registros, {
      dataInicio,
      dataFim,
      colaborador:
        colaboradorId === 'todos'
          ? 'todos'
          : colaboradores.find((c) => c.id === colaboradorId)?.name || colaboradorId,
      status,
    })
  }

  return (
    <MainLayout
      title="Relatórios e Indicadores"
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportPDF}
            className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            <FileDown className="w-4 h-4 mr-1.5" /> Exportar PDF
          </Button>
          <Button
            onClick={handleExportCSV}
            className="rounded-full bg-white hover:bg-[#FFF3E8] border border-[#E0447C]/40 text-[#E0447C] font-bold text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportar CSV
          </Button>
        </div>
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

      {/* ================= INDICADORES DO PERÍODO ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <IndicadorCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Aplicação"
          valor={`${indicadores.aplicacao}%`}
          desc={`${indicadores.aplicaveis} de ${indicadores.total} atribuições concluídas ou N/A`}
          cor="#2D7A51"
        />
        <IndicadorCard
          icon={<Timer className="w-4 h-4" />}
          label="Pontualidade"
          valor={`${indicadores.pontualidade}%`}
          desc="Concluídas dentro do horário-limite"
          cor="#3B7A9C"
        />
        <IndicadorCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Esforço"
          valor={String(indicadores.esforco)}
          desc="Registros respondidos no período"
          cor="#E0447C"
        />
        <IndicadorCard
          icon={<Zap className="w-4 h-4" />}
          label="Score geral"
          valor={`${indicadores.score}%`}
          desc="Média dos indicadores"
          cor="#E0447C"
          destaque
        />
      </div>

      {/* ================= ABAS: RESUMO / MATRIZ / RANKING ================= */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(
          [
            { id: 'resumo', label: 'Resumo', icon: BarChart3 },
            { id: 'matriz', label: 'Matriz por Item', icon: Grid3X3 },
            { id: 'ranking', label: 'Ranking', icon: Trophy },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              aba === id
                ? 'bg-[#E0447C] text-white shadow-sm'
                : 'bg-white text-[#8A6F6F] border border-[#F2A65A]/30 hover:border-[#E0447C]/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {aba === 'resumo' && (
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
      )}
      {aba === 'matriz' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="w-4 h-4 text-[#E0447C]" />
            <h3 className="font-display font-bold text-base text-[#3B2B2B]">
              Matriz por Item — Tarefas × Dias
            </h3>
          </div>
          <p className="text-xs text-[#8A6F6F] mb-4">
            Cada célula mostra o resultado da tarefa no dia: conforme, fora do padrão, N/A ou sem
            registro. Passe o mouse para ver responsável e observação.
          </p>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-[#E0447C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : matriz.tarefas.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8A6F6F]">
              Nenhum registro para os filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F2A65A]/20 text-[#8A6F6F] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 sticky left-0 bg-white min-w-[180px]">Tarefa</th>
                    {matriz.dias.map((d) => (
                      <th key={d} className="py-3 px-2 whitespace-nowrap">
                        {new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2A65A]/10">
                  {matriz.tarefas.map((t) => (
                    <tr key={t.titulo + t.processo} className="hover:bg-[#FFF9F2]/50 transition">
                      <td className="py-3 px-3 sticky left-0 bg-white">
                        <p className="font-bold text-[#3B2B2B] flex items-center gap-1">
                          {t.titulo}
                          {t.critica && <Zap className="w-3 h-3 text-[#E5484D]" />}
                        </p>
                        <p className="text-[10px] text-[#8A6F6F]">{t.processo}</p>
                      </td>
                      {matriz.dias.map((d) => {
                        const r = t.celulas.get(d)
                        return (
                          <td key={d} className="py-2 px-2">
                            {r ? (
                              celulaMatriz(r)
                            ) : (
                              <span className="text-stone-300 text-[10px]">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {aba === 'ranking' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-[#E0447C]" />
            <h3 className="font-display font-bold text-base text-[#3B2B2B]">
              Ranking de Colaboradores
            </h3>
          </div>
          {ranking.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8A6F6F]">
              Nenhum registro para os filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F2A65A]/20 text-[#8A6F6F] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Colaborador</th>
                    <th className="py-3 px-3 text-center">Itens</th>
                    <th className="py-3 px-3 text-center">Aplicação</th>
                    <th className="py-3 px-3 text-center">Pontualidade</th>
                    <th className="py-3 px-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2A65A]/10">
                  {ranking.map((r, i) => (
                    <tr key={r.nome} className="hover:bg-[#FFF9F2]/50 transition">
                      <td className="py-3 px-3 font-bold text-[#E0447C]">{i + 1}º</td>
                      <td className="py-3 px-3 font-bold text-[#3B2B2B]">{r.nome}</td>
                      <td className="py-3 px-3 text-center text-[#8A6F6F]">{r.total}</td>
                      <td className="py-3 px-3 text-center font-semibold text-[#2D7A51]">
                        {r.aplicacao}%
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#3B7A9C]">
                        {r.pontualidade}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block font-bold px-2 py-0.5 rounded-full ${
                            i === 0 ? 'bg-[#FFF3D6] text-[#B77A0A]' : 'bg-[#FFF9F2] text-[#3B2B2B]'
                          }`}
                        >
                          {r.score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TABELA DE DETALHE COMPLETO (aba Resumo) ================= */}
      {aba === 'resumo' && (
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
                    <th className="py-3 px-3">Evidência</th>
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
                    const videoUrl = item.video ? usersService.getFileUrl(item, item.video) : null

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
                          {videoUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxEhVideo(true)
                                setLightboxFotoUrl(videoUrl)
                              }}
                              title="Assistir vídeo da tarefa"
                              className="w-8 h-8 rounded-lg overflow-hidden border border-[#3B2B2B]/30 hover:scale-105 transition flex items-center justify-center bg-[#3B2B2B] cursor-pointer"
                            >
                              <Video className="w-4 h-4 text-white" />
                            </button>
                          ) : fotoUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxEhVideo(false)
                                setLightboxFotoUrl(fotoUrl)
                              }}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-[#E0447C]/40 hover:scale-105 transition block cursor-pointer"
                            >
                              <img
                                src={fotoUrl}
                                alt="Foto"
                                className="w-full h-full object-cover"
                              />
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
      )}

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
            {lightboxEhVideo ? (
              <video
                src={lightboxFotoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-auto max-h-[85vh] rounded-2xl bg-black"
              />
            ) : (
              <img
                src={lightboxFotoUrl}
                alt="Evidência ampliada"
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
              />
            )}
          </div>
        </div>
      )}
    </MainLayout>
  )
}
