import { atribuicoesService } from '@/services/atribuicoes'
import type { AtribuicaoRecord, UserRecord } from '@/types'

/** Linha do ranking de premiação (um colaborador no mês) */
export interface PremiacaoRow {
  colaboradorId: string
  nome: string
  avatar?: string
  colab?: UserRecord
  concluidas: number
  /** Horário da última conclusão do mês (usado no desempate) */
  ultimaConclusao: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Mês corrente no formato 'YYYY-MM' */
export function mesAtualYM(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

/** Primeiro e último dia (YYYY-MM-DD) do mês 'YYYY-MM' */
export function intervaloDoMes(ym: string) {
  const [ano, mes] = ym.split('-').map(Number)
  const ultimo = new Date(ano, mes, 0).getDate()
  return {
    inicio: `${ano}-${pad(mes)}-01`,
    fim: `${ano}-${pad(mes)}-${pad(ultimo)}`,
  }
}

/** Lista de meses 'YYYY-MM' do mais recente para o mais antigo */
export function listaMeses(qtd = 24, ref = new Date()): string[] {
  const out: string[] = []
  for (let i = 0; i < qtd; i++) {
    out.push(mesAtualYM(new Date(ref.getFullYear(), ref.getMonth() - i, 1)))
  }
  return out
}

/** Rótulo em português: "Novembro de 2026" */
export function rotuloMes(ym: string): string {
  const [ano, mes] = ym.split('-').map(Number)
  const txt = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

/** Verdadeiro quando a data é o último dia do mês (30, 31 ou 28/29 em fevereiro) */
export function ehUltimoDiaDoMes(now = new Date()): boolean {
  const ultimo = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() === ultimo
}

/** Busca as atribuições concluídas do mês (status 'concluida'; 'nao_aplicavel' não entra) */
export async function buscarConcluidasDoMes(ym: string): Promise<AtribuicaoRecord[]> {
  const { inicio, fim } = intervaloDoMes(ym)
  return atribuicoesService.listRange(inicio, fim, { status: 'concluida' })
}

const tempo = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY)

/**
 * Conta tarefas concluídas por colaborador e ordena.
 * Critério: 1) mais tarefas concluídas; 2) empate → quem atingiu esse total mais cedo
 * (horário da última conclusão mais antigo); 3) nome (estável).
 */
export function montarPodio(atribs: AtribuicaoRecord[]): PremiacaoRow[] {
  const map = new Map<string, PremiacaoRow>()

  for (const a of atribs) {
    if (a.status !== 'concluida') continue

    const colab = a.expand?.colaborador
    let row = map.get(a.colaborador)
    if (!row) {
      row = {
        colaboradorId: a.colaborador,
        nome: colab?.name || colab?.email || 'Colaborador',
        avatar: colab?.avatar,
        colab,
        concluidas: 0,
        ultimaConclusao: null,
      }
      map.set(a.colaborador, row)
    }

    row.concluidas += 1
    const quando = a.concluida_em || a.updated || null
    if (quando && (!row.ultimaConclusao || tempo(quando) > tempo(row.ultimaConclusao))) {
      row.ultimaConclusao = quando
    }
  }

  return Array.from(map.values()).sort(
    (x, y) =>
      y.concluidas - x.concluidas ||
      tempo(x.ultimaConclusao) - tempo(y.ultimaConclusao) ||
      x.nome.localeCompare(y.nome, 'pt-BR'),
  )
}
