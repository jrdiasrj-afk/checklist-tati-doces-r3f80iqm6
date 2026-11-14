import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { atribuicoesService } from '@/services/atribuicoes'
import { usersService } from '@/services/users'
import { alertasService } from '@/services/alertas'
import { useRealtime } from '@/hooks/use-realtime'
import {
  estaAtrasada,
  minutosAtraso,
  calcularIndicadores,
  montarRanking,
  type Indicadores,
} from '@/services/indicadores'
import type { AtribuicaoRecord, UserRecord, AlertaRecord } from '@/types'
import { LOCAIS, LOCAL_LABELS, localLabel, isLocalValue } from '@/lib/locais'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AreaBadge } from '@/components/AreaBadge'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Camera,
  Calendar,
  X,
  Zap,
  Thermometer,
  Timer,
  Bell,
  RefreshCw,
  Trophy,
  EyeOff,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

function minutosAtrasoTexto(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

function IndicadorCard({
  label,
  valor,
  desc,
  cor,
  destaque = false,
}: {
  label: string
  valor: string
  desc: string
  cor: string
  destaque?: boolean
}) {
  return (
    <div
      className={`bg-white p-5 rounded-2xl shadow-xs flex items-center justify-between ${
        destaque ? 'border-2 border-[#E0447C]/40' : 'border border-[#F2A65A]/20'
      }`}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#8A6F6F]">{label}</p>
        <h3 className="text-3xl font-display font-extrabold mt-1" style={{ color: cor }}>
          {valor}
        </h3>
        <p className="text-[11px] text-[#8A6F6F] mt-0.5">{desc}</p>
      </div>
      <Timer className="w-9 h-9 opacity-20 shrink-0" style={{ color: cor }} />
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()

  // Estados de filtro
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedColab, setSelectedColab] = useState<string>('todos')
  const [selectedArea, setSelectedArea] = useState<string>('todas')
  const [selectedLocal, setSelectedLocal] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Dados
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoRecord[]>([])
  const [colaboradores, setColaboradores] = useState<UserRecord[]>([])
  const [alertas, setAlertas] = useState<AlertaRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Histórico de pendências anteriores (para o cartão de atrasadas, filtrável)
  const [atrasadasHistorico, setAtrasadasHistorico] = useState<AtribuicaoRecord[]>([])

  // Drawer de Detalhe da Tarefa
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<AtribuicaoRecord | null>(null)

  // Animação pop tempo real (id do item que acabou de atualizar)
  const [recentUpdatedId, setRecentUpdatedId] = useState<string | null>(null)

  // Carregar dados de colaboradores e processos
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [usersList, alertasList] = await Promise.all([
          usersService.list(),
          alertasService.list(),
        ])
        setColaboradores(usersList)
        setAlertas(alertasList)
      } catch (err) {
        console.error('Erro ao carregar filtros:', err)
      }
    }
    loadFilters()
  }, [])

  // Carregar atribuições do dia selecionado + contagem de atrasadas
  const loadDayData = useCallback(async () => {
    setLoading(true)
    try {
      const colabId = selectedColab === 'todos' ? undefined : selectedColab
      const list = await atribuicoesService.listByDate(selectedDate, colabId)
      setAtribuicoes(list)

      // Calcular atrasadas de datas anteriores
      const startOfHistory = '2020-01-01'
      const yesterday = new Date(selectedDate)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (yesterdayStr >= startOfHistory) {
        const pastPending = await atribuicoesService.listRange(startOfHistory, yesterdayStr, {
          colaboradorId: colabId,
          status: 'pendente',
        })
        setAtrasadasHistorico(pastPending)
      } else {
        setAtrasadasHistorico([])
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dia:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedColab])

  useEffect(() => {
    loadDayData()
  }, [loadDayData])

  // Tempo Real via PocketBase SSE
  useRealtime<AtribuicaoRecord>('atribuicoes', (e) => {
    if (e.action === 'create' || e.action === 'update' || e.action === 'delete') {
      loadDayData()
      if (e.record && e.record.id) {
        setRecentUpdatedId(e.record.id)
        setTimeout(() => setRecentUpdatedId(null), 1200)
      }
    }
  })

  // Filtragem local por local/área/status (base para TODOS os índices e listas)
  const filteredAtribuicoes = useMemo(() => {
    return atribuicoes.filter((item) => {
      // Filtro de status clicado no donut
      if (statusFilter && item.status !== statusFilter) {
        return false
      }
      // Filtro de local (pelo processo da tarefa)
      if (selectedLocal !== 'todos') {
        const local = item.expand?.tarefa?.expand?.processo?.local
        if (local !== selectedLocal) return false
      }
      // Filtro de área
      if (selectedArea !== 'todas') {
        const area = item.expand?.tarefa?.expand?.processo?.area
        if (area !== selectedArea) return false
      }
      return true
    })
  }, [atribuicoes, statusFilter, selectedLocal, selectedArea])

  // Atrasadas (datas anteriores) também respeitam local, colaborador e área
  const atrasadasFiltradas = useMemo(() => {
    return atrasadasHistorico.filter((item) => {
      if (selectedLocal !== 'todos') {
        if (item.expand?.tarefa?.expand?.processo?.local !== selectedLocal) return false
      }
      if (selectedArea !== 'todas') {
        if (item.expand?.tarefa?.expand?.processo?.area !== selectedArea) return false
      }
      return true
    })
  }, [atrasadasHistorico, selectedLocal, selectedArea])

  // KPIs — calculados sobre a lista JÁ FILTRADA (data + colaborador vem do servidor)
  const kpis = useMemo(() => {
    const total = filteredAtribuicoes.length
    const concluidas = filteredAtribuicoes.filter((a) => a.status === 'concluida').length
    const pendentes = filteredAtribuicoes.filter((a) => a.status === 'pendente').length
    const naoAplicaveis = filteredAtribuicoes.filter((a) => a.status === 'nao_aplicavel').length
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0

    return {
      total,
      concluidas,
      pendentes,
      naoAplicaveis,
      taxa,
      atrasadas: atrasadasFiltradas.length,
    }
  }, [filteredAtribuicoes, atrasadasFiltradas])

  // Dados do gráfico donut
  const chartData = useMemo(() => {
    return [
      { name: 'Concluídas', status: 'concluida', value: kpis.concluidas, color: '#3FA372' },
      { name: 'Pendentes', status: 'pendente', value: kpis.pendentes, color: '#F5B841' },
      { name: 'Atrasadas', status: 'atrasada', value: kpis.atrasadas, color: '#E5484D' },
      {
        name: 'Não aplicáveis',
        status: 'nao_aplicavel',
        value: kpis.naoAplicaveis,
        color: '#B8AFA8',
      },
    ].filter((d) => d.value > 0)
  }, [kpis])

  // Indicadores do dia (estilo Koncluí) — sobre a lista já filtrada
  const indicadores = useMemo<Indicadores>(
    () => calcularIndicadores(filteredAtribuicoes),
    [filteredAtribuicoes],
  )

  // Alertas do sistema (coleção alertas) filtrados pelo local selecionado
  const [verificando, setVerificando] = useState(false)

  const alertasFiltrados = useMemo(() => {
    if (selectedLocal === 'todos') return alertas
    return alertas.filter((al) => al.local === selectedLocal)
  }, [alertas, selectedLocal])

  const handleVerificarAlertas = async () => {
    setVerificando(true)
    try {
      await alertasService.verificar()
      const list = await alertasService.list()
      setAlertas(list)
    } catch (err) {
      console.error('Erro ao verificar alertas:', err)
    } finally {
      setVerificando(false)
    }
  }

  // Alertas de itens críticos pendentes/atrasados, com responsável e atraso
  const alertasCriticos = useMemo(() => {
    const agora = new Date()
    return filteredAtribuicoes
      .filter((a) => a.status === 'pendente')
      .filter((a) => !!a.expand?.tarefa?.critica || estaAtrasada(a, agora))
      .map((a) => ({
        a,
        critica: !!a.expand?.tarefa?.critica,
        atrasada: estaAtrasada(a, agora),
        min: minutosAtraso(a, agora),
        resp: a.expand?.colaborador?.name || a.expand?.colaborador?.email || '—',
      }))
      .sort((x, y) => {
        if (x.critica !== y.critica) return x.critica ? -1 : 1
        return y.min - x.min
      })
  }, [filteredAtribuicoes])

  // Itens concluídos fora do padrão (medição fora do alvo)
  const foraPadrao = useMemo(
    () => filteredAtribuicoes.filter((a) => a.status === 'concluida' && a.fora_padrao),
    [filteredAtribuicoes],
  )

  // Agrupamento por colaborador
  const groupedByColaborador = useMemo(() => {
    const map = new Map<string, { colab: UserRecord | undefined; items: AtribuicaoRecord[] }>()

    filteredAtribuicoes.forEach((atrib) => {
      const colabId = atrib.colaborador
      if (!map.has(colabId)) {
        map.set(colabId, {
          colab: atrib.expand?.colaborador,
          items: [],
        })
      }
      map.get(colabId)!.items.push(atrib)
    })

    return Array.from(map.values())
  }, [filteredAtribuicoes])

  // ===== Ranking por pontos (padrão Koncluí: score 0–100) =====
  const rankingPontos = useMemo(() => {
    return montarRanking(filteredAtribuicoes, colaboradores)
  }, [filteredAtribuicoes, colaboradores])

  // ===== Quem NÃO está acessando: pendentes sem conclusão e sem abertura registrada =====
  const naoAcessando = useMemo(() => {
    const agora = new Date()
    const porColab = new Map<
      string,
      { colab: UserRecord | undefined; total: number; diasAtras: number[] }
    >()
    filteredAtribuicoes
      .filter((a) => a.status === 'pendente')
      .forEach((a) => {
        const id = a.colaborador
        if (!porColab.has(id)) {
          porColab.set(id, { colab: a.expand?.colaborador, total: 0, diasAtras: [] })
        }
        const entry = porColab.get(id)!
        entry.total += 1
        const ultimaAtividade = a.updated || a.created
        const dias = Math.floor((agora.getTime() - new Date(ultimaAtividade).getTime()) / 86400000)
        entry.diasAtras.push(dias)
      })

    const semAcesso = colaboradores
      .filter((c) => c.role === 'colaborador' || c.role === 'gerente')
      .filter((c) => {
        if (selectedColab !== 'todos' && c.id !== selectedColab) return false
        if (selectedLocal !== 'todos' && c.local && c.local !== selectedLocal) return false
        return true
      })
      .map((c) => {
        const entry = porColab.get(c.id)
        const pendentes = entry?.total || 0
        const ultimoAcesso = c.ultimo_acesso ? new Date(c.ultimo_acesso) : null
        const diasSemAcesso = ultimoAcesso
          ? Math.floor((agora.getTime() - ultimoAcesso.getTime()) / 86400000)
          : null
        return { colab: c, pendentes, diasSemAcesso }
      })
      .filter(
        ({ pendentes, diasSemAcesso }) =>
          diasSemAcesso === null || diasSemAcesso >= 2 || pendentes > 0,
      )
      .sort(
        (a, b) => (b.diasSemAcesso ?? 999) - (a.diasSemAcesso ?? 999) || b.pendentes - a.pendentes,
      )

    return semAcesso
  }, [filteredAtribuicoes, colaboradores, selectedColab, selectedLocal])

  return (
    <MainLayout
      title="Dashboard Operacional"
      actions={
        <Button
          onClick={() => navigate('/escala')}
          className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold shadow-sm text-sm"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Escalar Processo
        </Button>
      }
    >
      {/* ================= BARRA DE FILTROS ================= */}
      <div className="bg-white p-4 rounded-2xl border border-[#F2A65A]/20 shadow-xs mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8A6F6F]" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 w-40 rounded-xl bg-[#FFF9F2]/50 border-[#F2A65A]/30 text-xs font-semibold"
          />
        </div>

        <div className="w-40">
          <Select value={selectedLocal} onValueChange={setSelectedLocal}>
            <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/50 border-[#F2A65A]/30 text-xs font-semibold">
              <SelectValue placeholder="Local" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os locais</SelectItem>
              {LOCAIS.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOCAL_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Select value={selectedColab} onValueChange={setSelectedColab}>
            <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/50 border-[#F2A65A]/30 text-xs font-semibold">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos colaboradores</SelectItem>
              {colaboradores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name || c.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/50 border-[#F2A65A]/30 text-xs font-semibold">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as áreas</SelectItem>
              <SelectItem value="Cozinha">Cozinha</SelectItem>
              <SelectItem value="Loja">Loja</SelectItem>
              <SelectItem value="Caixa">Caixa</SelectItem>
              <SelectItem value="Limpeza">Limpeza</SelectItem>
              <SelectItem value="Estoque">Estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {statusFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="text-xs text-[#E0447C] font-semibold h-10 px-3 hover:bg-[#FFF3E8]"
          >
            Limpar filtro status ({statusFilter}) <X className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>

      {/* ================= ALERTAS DO SISTEMA (coleção alertas: fora_prazo / fim_dia) ================= */}
      {alertasFiltrados.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#B77A0A]/30 bg-[#FFFBEB] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#B77A0A]" />
              <h2 className="text-sm font-display font-bold text-[#B77A0A]">
                Alertas aos supervisores ({alertasFiltrados.length})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={verificando}
              onClick={handleVerificarAlertas}
              className="rounded-full border-[#B77A0A]/40 text-[#B77A0A] hover:bg-[#B77A0A]/10 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${verificando ? 'animate-spin' : ''}`} />
              Verificar agora
            </Button>
          </div>
          <p className="text-xs text-[#8A6F6F] mb-3">
            Notificações geradas para o supervisor quando uma tarefa passa do horário-limite ou
            segue pendente no fim do dia.
          </p>
          <div className="space-y-2">
            {alertasFiltrados.slice(0, 6).map((al) => (
              <div
                key={al.id}
                className="flex items-start gap-3 bg-white rounded-xl px-3 py-2.5 border border-[#B77A0A]/20"
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    al.tipo === 'fora_prazo'
                      ? 'bg-[#E5484D]/15 text-[#E5484D]'
                      : 'bg-[#F5B841]/15 text-[#B77A0A]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#3B2B2B]">{al.mensagem || 'Sem mensagem'}</p>
                  <p className="text-[11px] text-[#8A6F6F] mt-0.5">
                    {alertasService.tipoLabel(al.tipo)}
                    {al.expand?.supervisor?.name || al.expand?.supervisor?.email
                      ? ` · supervisor: ${al.expand?.supervisor?.name || al.expand?.supervisor?.email}`
                      : ' · sem supervisor'}
                    {isLocalValue(al.local) ? ` · ${localLabel(al.local)}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {alertasFiltrados.length > 6 && (
              <p className="text-[11px] text-[#8A6F6F] pl-1">
                + {alertasFiltrados.length - 6} outros alertas…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= ALERTAS (críticos + atrasados com responsável) ================= */}
      {alertasCriticos.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#E5484D]/30 bg-[#FFF5F5] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#E5484D]" />
            <h2 className="text-sm font-display font-bold text-[#E5484D]">
              Alertas do dia ({alertasCriticos.length})
            </h2>
          </div>
          <p className="text-xs text-[#8A6F6F] mb-3">
            Itens críticos primeiro — passaram do horário-limite e ainda aguardam registro.
          </p>
          <div className="space-y-2">
            {alertasCriticos.slice(0, 6).map(({ a, critica, atrasada, min, resp }) => {
              const tarefa = a.expand?.tarefa
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedTaskDetail(a)}
                  className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-[#E5484D]/20 cursor-pointer hover:border-[#E5484D]/50 transition"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      critica ? 'bg-[#E5484D]/15 text-[#E5484D]' : 'bg-[#F5B841]/15 text-[#B77A0A]'
                    }`}
                  >
                    {critica ? <Zap className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#3B2B2B] truncate">
                      {tarefa?.titulo || 'Tarefa'}
                      {critica && ' · crítica'}
                    </p>
                    <p className="text-[11px] text-[#8A6F6F] truncate">
                      {resp}
                      {atrasada
                        ? ` · ${minutosAtrasoTexto(min)} após o limite`
                        : ' · aguardando registro'}
                      {a.expand?.tarefa?.expand?.processo?.nome
                        ? ` · ${a.expand.tarefa.expand.processo.nome}`
                        : ''}
                    </p>
                  </div>
                  {atrasada && (
                    <span className="text-[11px] font-bold text-[#E5484D] bg-[#E5484D]/10 px-2 py-0.5 rounded-full shrink-0">
                      +{minutosAtrasoTexto(min)}
                    </span>
                  )}
                </div>
              )
            })}
            {alertasCriticos.length > 6 && (
              <p className="text-[11px] text-[#8A6F6F] pl-1">
                + {alertasCriticos.length - 6} outros alertas…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= INDICADORES (Aplicação / Pontualidade / Esforço / Score) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <IndicadorCard
          label="Aplicação"
          valor={`${indicadores.aplicacao}%`}
          desc="Concluídas + N/A"
          cor="#2D7A51"
        />
        <IndicadorCard
          label="Pontualidade"
          valor={`${indicadores.pontualidade}%`}
          desc="Antes do limite"
          cor="#3B7A9C"
        />
        <IndicadorCard
          label="Esforço"
          valor={String(indicadores.esforco)}
          desc="Itens respondidos"
          cor="#E0447C"
        />
        <IndicadorCard
          label="Score geral"
          valor={`${indicadores.score}%`}
          desc="Média dos indicadores"
          cor="#E0447C"
          destaque
        />
      </div>

      {/* ================= FAIXA DE KPIS (4 CARTÕES) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Cartão 1: Concluídas Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-[#F2A65A]/20 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A6F6F]">
              Concluídas Hoje
            </p>
            <h3 className="text-3xl font-display font-extrabold text-[#3FA372] mt-1">
              {kpis.concluidas}
              <span className="text-sm font-semibold text-[#8A6F6F] ml-1">/ {kpis.total}</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#3FA372]/15 flex items-center justify-center text-[#3FA372]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>

        {/* Cartão 2: Pendentes */}
        <div className="bg-white p-5 rounded-2xl border border-[#F2A65A]/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A6F6F]">Pendentes</p>
            <h3 className="text-3xl font-display font-extrabold text-[#F5B841] mt-1">
              {kpis.pendentes}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#F5B841]/15 flex items-center justify-center text-[#F5B841]">
            <Clock className="w-7 h-7" />
          </div>
        </div>

        {/* Cartão 3: Atrasadas */}
        <div className="bg-white p-5 rounded-2xl border border-[#F2A65A]/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A6F6F]">
              Atrasadas (anteriores)
            </p>
            <h3 className="text-3xl font-display font-extrabold text-[#E5484D] mt-1">
              {kpis.atrasadas}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#E5484D]/15 flex items-center justify-center text-[#E5484D]">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>

        {/* Cartão 4: Taxa de Conclusão */}
        <div className="bg-white p-5 rounded-2xl border border-[#F2A65A]/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A6F6F]">
              Taxa de Conclusão
            </p>
            <h3 className="text-3xl font-display font-extrabold text-[#E0447C] mt-1">
              {kpis.taxa}%
            </h3>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#FFF3E8" strokeWidth="4" fill="none" />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#E0447C"
                strokeWidth="4"
                strokeDasharray={126}
                strokeDashoffset={126 - (126 * kpis.taxa) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-[#3B2B2B]">{kpis.taxa}%</span>
          </div>
        </div>
      </div>

      {/* ================= FORA DO PADRÃO (medições fora do alvo) ================= */}
      {foraPadrao.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#F5B841]/40 bg-[#FFFBEB] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-[#B77A0A]" />
            <h2 className="text-sm font-display font-bold text-[#B77A0A]">
              Fora do padrão ({foraPadrao.length})
            </h2>
          </div>
          <div className="space-y-1.5">
            {foraPadrao.map((a) => {
              const t = a.expand?.tarefa
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedTaskDetail(a)}
                  className="w-full flex items-center gap-2 text-left bg-white rounded-xl px-3 py-2 border border-[#F5B841]/30 hover:border-[#B77A0A]/50 transition cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#3B2B2B] truncate flex-1">
                    {t?.titulo}
                  </span>
                  <span className="text-[11px] font-bold text-[#E5484D] shrink-0">
                    {a.medicao_valor}
                    {t?.medicao_unidade || ''} · alvo até {t?.medicao_max ?? t?.medicao_alvo}
                    {t?.medicao_unidade || ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ================= RANKING POR PONTOS + QUEM NÃO ESTÁ ACESSANDO ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ranking de funcionários por pontos */}
        <div className="bg-white p-6 rounded-3xl border border-[#F2A65A]/20 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-[#E0447C]" />
            <h2 className="text-lg font-display font-bold text-[#3B2B2B]">Ranking de Pontos</h2>
          </div>
          <p className="text-xs text-[#8A6F6F] mb-4">
            Quem está entregando todas as atividades no período filtrado — pontuação no padrão
            Koncluí (score 0–100).
          </p>
          {rankingPontos.length === 0 ? (
            <p className="text-xs text-[#8A6F6F] py-4 text-center">
              Sem tarefas no período para pontuar.
            </p>
          ) : (
            <div className="space-y-2">
              {rankingPontos.map((r, i) => {
                const emDia = r.total === 0 || r.concluidas + 0 >= r.total * 0.999
                const isTop3 = i < 3
                return (
                  <div
                    key={r.colaboradorId}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                      isTop3
                        ? 'border-[#E0447C]/30 bg-[#FFF3E8]/60'
                        : 'border-[#F2A65A]/15 bg-white'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                        i === 0
                          ? 'bg-[#E0447C] text-white'
                          : i === 1
                            ? 'bg-[#F2A65A] text-white'
                            : i === 2
                              ? 'bg-[#B77A0A] text-white'
                              : 'bg-[#FFF9F2] text-[#8A6F6F] border border-[#F2A65A]/30'
                      }`}
                    >
                      {i + 1}º
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#3B2B2B] truncate">
                        {r.nome}
                        {emDia && (
                          <span className="ml-2 text-[10px] font-bold text-[#2D7A51] bg-[#EDF8F1] px-1.5 py-0.5 rounded-full">
                            em dia
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#8A6F6F]">
                        {r.concluidas}/{r.total} entregues · {r.percentual}% de conclusão
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-display font-extrabold text-[#E0447C] leading-none">
                        {r.score}
                      </p>
                      <p className="text-[10px] text-[#8A6F6F] font-semibold">pontos</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quem NÃO está acessando as atividades */}
        <div className="bg-white p-6 rounded-3xl border border-[#F2A65A]/20 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <EyeOff className="w-4 h-4 text-[#B77A0A]" />
            <h2 className="text-lg font-display font-bold text-[#3B2B2B]">Não estão acessando</h2>
          </div>
          <p className="text-xs text-[#8A6F6F] mb-4">
            Colaboradores com tarefas pendentes sem nenhum registro de interação — ou sem acessar o
            sistema há 2 dias ou mais.
          </p>
          {naoAcessando.length === 0 ? (
            <p className="text-xs text-[#3FA372] py-4 text-center font-semibold">
              🎉 Toda a equipe está acessando e registrando as tarefas.
            </p>
          ) : (
            <div className="space-y-2">
              {naoAcessando.slice(0, 8).map(({ colab, pendentes, diasSemAcesso }) => (
                <div
                  key={colab.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-[#F5B841]/30 bg-[#FFFBEB]/60"
                >
                  <Avatar className="w-9 h-9 border border-[#F2A65A]/40 shrink-0">
                    <AvatarImage
                      src={colab.avatar ? usersService.getFileUrl(colab, colab.avatar) : ''}
                    />
                    <AvatarFallback className="bg-[#F5B841]/15 text-[#B77A0A] font-bold text-[10px]">
                      {colab.name ? colab.name.slice(0, 2).toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#3B2B2B] truncate">
                      {colab.name || colab.email}
                    </p>
                    <p className="text-[11px] text-[#8A6F6F]">
                      {diasSemAcesso === null
                        ? 'Nunca registrou acesso ao checklist'
                        : `Sem acessar há ${diasSemAcesso} dia(s)`}
                      {pendentes > 0 && ` · ${pendentes} tarefa(s) pendente(s)`}
                    </p>
                  </div>
                  {diasSemAcesso !== null && diasSemAcesso >= 3 && (
                    <span className="text-[10px] font-bold text-[#E5484D] bg-[#E5484D]/10 px-2 py-0.5 rounded-full shrink-0">
                      crítico
                    </span>
                  )}
                </div>
              ))}
              {naoAcessando.length > 8 && (
                <p className="text-[11px] text-[#8A6F6F] pl-1">
                  + {naoAcessando.length - 8} outros…
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= GRID: GRÁFICO DONUT + LISTA DO DIA ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Panorama Donut */}
        <div className="bg-white p-6 rounded-3xl border border-[#F2A65A]/20 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-[#3B2B2B]">Panorama de Hoje</h2>
            <span className="text-xs text-[#8A6F6F] font-semibold">Clique para filtrar</span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4">
              <span className="text-4xl mb-2">🧁</span>
              <p className="text-sm font-semibold text-[#8A6F6F]">Sem atribuições para esta data</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      onClick={(entry: any) => {
                        const st = entry?.status || entry?.payload?.status
                        if (st) {
                          setStatusFilter(st === statusFilter ? null : st)
                        }
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-[#3B2B2B] text-[#FFF9F2] px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md">
                              {data.name}: {data.value}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legendas clicáveis */}
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                {chartData.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setStatusFilter(d.status === statusFilter ? null : d.status)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                      statusFilter === d.status
                        ? 'border-[#E0447C] bg-[#FFF3E8]'
                        : 'border-transparent hover:bg-[#FFF9F2]'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: d.color }}
                    ></span>
                    <span className="truncate">{d.name}</span>
                    <span className="ml-auto font-bold">{d.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2 e 3: Lista por Colaborador */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-[#3B2B2B]">
              Execução do Dia por Colaborador
            </h2>
            <span className="text-xs font-semibold text-[#8A6F6F]">
              {filteredAtribuicoes.length} tarefa(s) listada(s)
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white/70 animate-pulse border border-[#F2A65A]/20"
                />
              ))}
            </div>
          ) : groupedByColaborador.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#F2A65A]/20 shadow-xs">
              <span className="text-5xl">🧁</span>
              <h3 className="text-lg font-display font-bold text-[#3B2B2B] mt-3">
                Nenhuma tarefa encontrada
              </h3>
              <p className="text-sm text-[#8A6F6F] mt-1 max-w-sm mx-auto">
                Não há tarefas registradas para os filtros selecionados. Utilize o botão acima para
                escalar processos.
              </p>
              <Button
                onClick={() => navigate('/escala')}
                className="mt-4 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold"
              >
                Ir para Escala Diária
              </Button>
            </div>
          ) : (
            groupedByColaborador.map(({ colab, items }) => (
              <div
                key={colab?.id || 'unknown'}
                className="bg-white rounded-2xl p-5 border border-[#F2A65A]/20 shadow-xs"
              >
                {/* Header do Colaborador */}
                <div className="flex items-center justify-between pb-3 border-b border-[#F2A65A]/15">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-[#E0447C]/30">
                      <AvatarImage
                        src={colab?.avatar ? usersService.getFileUrl(colab, colab.avatar) : ''}
                      />
                      <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-xs">
                        {colab?.name ? colab.name.slice(0, 2).toUpperCase() : 'CO'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-display font-bold text-[#3B2B2B] text-base leading-tight">
                        {colab?.name || colab?.email || 'Colaborador'}
                      </h4>
                      <p className="text-xs text-[#8A6F6F]">{colab?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#3FA372]">
                      {items.filter((i) => i.status === 'concluida').length}/{items.length}{' '}
                      Concluídas
                    </span>
                  </div>
                </div>

                {/* Lista de Tarefas do Colaborador */}
                <div className="divide-y divide-[#F2A65A]/10 mt-2">
                  {items.map((atrib) => {
                    const isConcluida = atrib.status === 'concluida'
                    const isNaoAplicavel = atrib.status === 'nao_aplicavel'
                    const isPending = atrib.status === 'pendente'
                    const isAtrasada = isPending && estaAtrasada(atrib)
                    const isCritica = !!atrib.expand?.tarefa?.critica
                    const isPop = recentUpdatedId === atrib.id

                    const tarefa = atrib.expand?.tarefa
                    const processo = tarefa?.expand?.processo

                    return (
                      <div
                        key={atrib.id}
                        onClick={() => setSelectedTaskDetail(atrib)}
                        className={`py-3 px-2 flex items-center justify-between gap-3 rounded-xl transition cursor-pointer hover:bg-[#FFF9F2] ${
                          isPop ? 'bg-[#3FA372]/15 animate-pulso-tempo-real' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5">
                            {isConcluida && <CheckCircle2 className="w-5 h-5 text-[#3FA372]" />}
                            {isPending && <Clock className="w-5 h-5 text-[#F5B841]" />}
                            {isNaoAplicavel && <MinusCircle className="w-5 h-5 text-[#B8AFA8]" />}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isConcluida
                                  ? 'text-[#3B2B2B]'
                                  : isNaoAplicavel
                                    ? 'line-through text-[#8A6F6F]'
                                    : 'text-[#3B2B2B]'
                              }`}
                            >
                              {tarefa?.titulo || 'Tarefa'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {processo?.area && <AreaBadge area={processo.area} size="sm" />}
                              <span className="text-xs text-[#8A6F6F] truncate">
                                {processo?.nome}
                              </span>
                              {isCritica && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#E5484D] bg-[#E5484D]/10 px-1.5 py-0.5 rounded-full">
                                  <Zap className="w-2.5 h-2.5" /> Crítica
                                </span>
                              )}
                              {isAtrasada && (
                                <span className="text-[10px] font-bold text-[#E5484D] bg-[#E5484D]/10 px-1.5 py-0.5 rounded-full">
                                  Atrasada
                                </span>
                              )}
                              {isConcluida && atrib.fora_padrao && (
                                <span className="text-[10px] font-bold text-[#B77A0A] bg-[#FFFBEB] px-1.5 py-0.5 rounded-full">
                                  Fora do padrão
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Indicadores laterais (Foto / Obs / Status) */}
                        <div className="flex items-center gap-2 shrink-0">
                          {atrib.foto && (
                            <span
                              className="p-1 rounded-md bg-[#FFF3E8] text-[#E0447C]"
                              title="Possui foto anexada"
                            >
                              <Camera className="w-4 h-4" />
                            </span>
                          )}
                          {atrib.observacao && (
                            <span
                              className="text-xs bg-[#FFF9F2] border border-[#F2A65A]/20 px-2 py-0.5 rounded-md text-[#8A6F6F] max-w-[120px] truncate hidden sm:inline-block"
                              title={atrib.observacao}
                            >
                              Obs: {atrib.observacao}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              isConcluida
                                ? 'bg-[#EDF8F1] text-[#2D7A51]'
                                : isNaoAplicavel
                                  ? 'bg-stone-100 text-stone-600'
                                  : 'bg-[#FFF9E6] text-[#9E7314]'
                            }`}
                          >
                            {isConcluida
                              ? 'Concluída'
                              : isNaoAplicavel
                                ? 'Não se aplica'
                                : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= DRAWER / MODAL DE DETALHE DA TAREFA ================= */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#F2A65A]/20 shadow-2xl relative">
            <button
              onClick={() => setSelectedTaskDetail(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-[#8A6F6F] hover:bg-[#FFF3E8] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              {selectedTaskDetail.expand?.tarefa?.expand?.processo?.area && (
                <AreaBadge area={selectedTaskDetail.expand.tarefa.expand.processo.area} />
              )}
              <span className="text-xs font-semibold text-[#8A6F6F]">
                {selectedTaskDetail.expand?.tarefa?.expand?.processo?.nome}
              </span>
            </div>

            <h3 className="text-xl font-display font-bold text-[#3B2B2B]">
              {selectedTaskDetail.expand?.tarefa?.titulo}
            </h3>

            {selectedTaskDetail.expand?.tarefa?.descricao && (
              <p className="text-sm text-[#8A6F6F] mt-2 bg-[#FFF9F2] p-3 rounded-xl border border-[#F2A65A]/20">
                {selectedTaskDetail.expand.tarefa.descricao}
              </p>
            )}

            <div className="mt-5 space-y-3 border-t border-[#F2A65A]/15 pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-[#8A6F6F]">Colaborador:</span>
                <span className="font-bold text-[#3B2B2B]">
                  {selectedTaskDetail.expand?.colaborador?.name ||
                    selectedTaskDetail.expand?.colaborador?.email}
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-[#8A6F6F]">Status:</span>
                <span className="font-bold text-[#E0447C] uppercase">
                  {selectedTaskDetail.status}
                </span>
              </div>

              {selectedTaskDetail.concluida_em && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#8A6F6F]">Concluída em:</span>
                  <span className="font-bold text-[#3B2B2B]">
                    {new Date(selectedTaskDetail.concluida_em).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}

              {selectedTaskDetail.medicao_valor !== undefined &&
                selectedTaskDetail.medicao_valor !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A6F6F]">Valor medido:</span>
                    <span
                      className={`font-bold ${
                        selectedTaskDetail.fora_padrao ? 'text-[#E5484D]' : 'text-[#2D7A51]'
                      }`}
                    >
                      {selectedTaskDetail.medicao_valor}
                      {selectedTaskDetail.expand?.tarefa?.medicao_unidade || ''}
                      {selectedTaskDetail.fora_padrao && ' · fora do padrão'}
                    </span>
                  </div>
                )}

              {selectedTaskDetail.observacao && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-[#8A6F6F] block mb-1">
                    Observação do Colaborador:
                  </span>
                  <p className="text-sm bg-[#FFF3E8]/70 p-3 rounded-xl text-[#3B2B2B] italic">
                    "{selectedTaskDetail.observacao}"
                  </p>
                </div>
              )}

              {selectedTaskDetail.foto && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-[#8A6F6F] block mb-2">
                    Foto de Evidência:
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-[#F2A65A]/30">
                    <img
                      src={usersService.getFileUrl(selectedTaskDetail, selectedTaskDetail.foto)}
                      alt="Evidência da tarefa"
                      className="w-full max-h-72 object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F2A65A]/15 flex justify-end">
              <Button
                onClick={() => setSelectedTaskDetail(null)}
                className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold"
              >
                Fechar Detalhes
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
