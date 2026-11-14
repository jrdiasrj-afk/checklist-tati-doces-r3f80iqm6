import pb from '@/lib/pocketbase/client'
import type { ProcessoRecord, TarefaRecord } from '@/types'

export interface Indicadores {
  aplicacao: number
  pontualidade: number
  esforco: number
  score: number
  /** atribuições que contam para aplicação (concluídas + N/A) */
  aplicaveis: number
  total: number
}

export interface MatrizCell {
  status: 'conforme' | 'nao_conforme' | 'fora_padrao' | 'nao_aplicavel' | 'sem_registro'
  comFoto: boolean
}

export interface MatrizRow {
  tarefaId: string
  titulo: string
  critica: boolean
  processoNome: string
  cells: Record<string, MatrizCell>
}

export interface RankingRow {
  colaboradorId: string
  nome: string
  total: number
  concluidas: number
  percentual: number
  score: number
}

export const indicadoresService = {
  /** % das atribuições concluídas ou N/A sobre o total do período */
  calcularIndicadores(atribuicoes: AtribuicaoInput[]): Indicadores {
    const total = atribuicoes.length
    if (total === 0)
      return { aplicacao: 0, pontualidade: 0, esforco: 0, score: 0, aplicaveis: 0, total: 0 }

    const respondidas = atribuicoes.filter((a) => a.status !== 'pendente').length
    const aplicacao = Math.round((respondidas / total) * 100)

    const concluidas = atribuicoes.filter((a) => a.status === 'concluida')
    let pontuais = 0
    for (const a of concluidas) {
      if (estaNoPrazo(a)) pontuais++
    }
    const pontualidade =
      concluidas.length > 0 ? Math.round((pontuais / concluidas.length) * 100) : 100

    const esforco = Math.min(100, Math.round((respondidas / Math.max(total, 1)) * 100))
    const score = Math.round((aplicacao + pontualidade + esforco) / 3)

    return { aplicacao, pontualidade, esforco, score, aplicaveis: respondidas, total }
  },

  /** Monta a matriz por item: tarefas nas linhas, dias nas colunas */
  montarMatriz(
    atribuicoes: AtribuicaoInput[],
    tarefas: TarefaRecord[],
  ): { dias: string[]; rows: MatrizRow[] } {
    const diasSet = new Set<string>()
    for (const a of atribuicoes) {
      diasSet.add((a.data || '').split(' ')[0].split('T')[0])
    }
    const dias = Array.from(diasSet).sort()

    const byTask = new Map<string, MatrizRow>()
    for (const t of tarefas) {
      const proc = t.expand?.processo
      byTask.set(t.id, {
        tarefaId: t.id,
        titulo: t.titulo,
        critica: !!t.critica,
        processoNome: proc?.nome || '',
        cells: {},
      })
    }

    for (const a of atribuicoes) {
      const dia = (a.data || '').split(' ')[0].split('T')[0]
      let row = byTask.get(a.tarefa)
      if (!row) continue
      const tarefa = tarefas.find((t) => t.id === a.tarefa)

      let cell: MatrizCell
      if (a.status === 'nao_aplicavel') {
        cell = { status: 'nao_aplicavel', comFoto: false }
      } else if (a.status === 'pendente') {
        cell = { status: 'sem_registro', comFoto: false }
      } else if (a.fora_padrao) {
        cell = { status: 'fora_padrao', comFoto: !!a.foto }
      } else if (tarefa?.tipo_registro === 'medicao' && typeof a.medicao_valor === 'number') {
        cell = { status: 'nao_conforme', comFoto: !!a.foto }
      } else {
        cell = { status: 'conforme', comFoto: !!a.foto }
      }
      row.cells[dia] = cell
    }

    return { dias, rows: Array.from(byTask.values()) }
  },

  /** Ranking de colaboradores no período */
  montarRanking(
    atribuicoes: AtribuicaoInput[],
    users: { id: string; name?: string; email: string }[],
  ): RankingRow[] {
    const byUser = new Map<string, AtribuicaoInput[]>()
    for (const a of atribuicoes) {
      if (!byUser.has(a.colaborador)) byUser.set(a.colaborador, [])
      byUser.get(a.colaborador)!.push(a)
    }

    const ranking: RankingRow[] = []
    for (const [userId, list] of byUser) {
      const ind = indicadoresService.calcularIndicadores(list)
      const user = users.find((u) => u.id === userId)
      ranking.push({
        colaboradorId: userId,
        nome: user?.name || user?.email || 'Colaborador',
        total: list.length,
        concluidas: list.filter((a) => a.status === 'concluida').length,
        percentual: ind.aplicacao,
        score: ind.score,
      })
    }

    return ranking.sort((a, b) => b.score - a.score || b.percentual - a.percentual)
  },
}

export interface AtribuicaoInput {
  id: string
  tarefa: string
  colaborador: string
  data: string
  status: 'pendente' | 'concluida' | 'nao_aplicavel'
  concluida_em?: string
  horario_limite?: string
  medicao_valor?: number
  fora_padrao?: boolean
  foto?: string
  expand?: {
    tarefa?: TarefaRecord
    colaborador?: { id: string; name?: string; email: string }
  }
}

/** true se a conclusão ocorreu antes do horário-limite (ou se não há limite) */
export function estaNoPrazo(a: AtribuicaoInput): boolean {
  if (!a.concluida_em || !a.horario_limite) return true
  const limite = parseLimite(a.data, a.horario_limite)
  return new Date(a.concluida_em).getTime() <= limite.getTime()
}

export function estaAtrasada(
  a: Pick<AtribuicaoInput, 'data' | 'horario_limite' | 'status'>,
  agora = new Date(),
): boolean {
  if (a.status !== 'pendente' || !a.horario_limite) return false
  return agora.getTime() > parseLimite(a.data, a.horario_limite).getTime()
}

/** Data '2026-11-13 00:00:00.000Z' + '07:30' → Date no fuso local */
export function parseLimite(data: string, horario: string): Date {
  const dia = (data || '').split(' ')[0].split('T')[0]
  const [h, min] = (horario || '23:59').split(':').map(Number)
  const d = new Date(`${dia}T00:00:00`)
  d.setHours(h || 0, min || 0, 0, 0)
  return d
}

/** Minutos passados do horário-limite (0 se não atrasada) */
export function minutosAtraso(
  a: Pick<AtribuicaoInput, 'data' | 'horario_limite' | 'status'>,
  agora = new Date(),
): number {
  if (!estaAtrasada(a, agora)) return 0
  return Math.max(
    0,
    Math.round((agora.getTime() - parseLimite(a.data, a.horario_limite!).getTime()) / 60000),
  )
}

/** Alias de calcularIndicadores (usado nas páginas) */
export function calcularIndicadores(atribuicoes: AtribuicaoInput[]): Indicadores {
  return indicadoresService.calcularIndicadores(atribuicoes)
}

/** Ranking de colaboradores por pontos (score Koncluí 0–100) — usado na Dashboard */
export function montarRanking(
  atribuicoes: AtribuicaoInput[],
  users: { id: string; name?: string; email: string }[],
): RankingRow[] {
  return indicadoresService.montarRanking(atribuicoes, users)
}

/** Indicadores de um dia específico (dashboard) */
export function indicadoresDia(atribuicoes: AtribuicaoInput[], dia: Date): Indicadores {
  const chave = dia.toISOString().split('T')[0]
  const doDia = atribuicoes.filter((a) => (a.data || '').split(' ')[0].split('T')[0] === chave)
  return calcularIndicadores(doDia)
}
