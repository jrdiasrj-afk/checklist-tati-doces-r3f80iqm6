import pb from '@/lib/pocketbase/client'
import type { ProcessoRecord, TarefaRecord, TipoRegistro } from '@/types'

export const processosService = {
  async list(filters?: { ativo?: boolean; search?: string }) {
    let filterStr = ''
    const parts: string[] = []

    if (filters?.ativo !== undefined) {
      parts.push(`ativo = ${filters.ativo}`)
    }
    if (filters?.search) {
      parts.push(`nome ~ '${filters.search.replace(/'/g, "\\'")}'`)
    }

    if (parts.length > 0) {
      filterStr = parts.join(' && ')
    }

    return pb.collection<ProcessoRecord>('processos').getFullList({
      filter: filterStr || undefined,
      sort: 'nome',
      expand: 'criado_por',
    })
  },

  async getById(id: string) {
    return pb.collection<ProcessoRecord>('processos').getOne(id, {
      expand: 'criado_por',
    })
  },

  async create(data: {
    nome: string
    descricao?: string
    area: string
    ativo: boolean
    criado_por?: string
    local?: string
    recorrencia?: string
    dias_semana?: number[]
    horario_limite?: string
    vigencia?: string
    designados?: string[]
  }) {
    return pb.collection<ProcessoRecord>('processos').create(data)
  },

  async update(
    id: string,
    data: Partial<{
      nome: string
      descricao?: string
      area: string
      ativo: boolean
      local?: string
      recorrencia?: string
      dias_semana?: number[]
      horario_limite?: string
      vigencia?: string
      designados?: string[]
    }>,
  ) {
    return pb.collection<ProcessoRecord>('processos').update(id, data)
  },

  async delete(id: string) {
    return pb.collection('processos').delete(id)
  },

  // Tarefas vinculadas
  async listTarefas(processoId: string) {
    return pb.collection<TarefaRecord>('tarefas').getFullList({
      filter: `processo = '${processoId}'`,
      sort: 'ordem',
    })
  },

  async createTarefa(data: {
    processo: string
    titulo: string
    descricao?: string
    ordem: number
    evidencia_obrigatoria: boolean
    ativa: boolean
    critica?: boolean
    tipo_registro?: TipoRegistro
    medicao_alvo?: number
    medicao_max?: number
    medicao_unidade?: string
  }) {
    return pb.collection<TarefaRecord>('tarefas').create(data)
  },

  async updateTarefa(
    id: string,
    data: Partial<{
      titulo: string
      descricao?: string
      ordem: number
      evidencia_obrigatoria: boolean
      ativa: boolean
      critica?: boolean
      tipo_registro?: string
      medicao_alvo?: number
      medicao_max?: number
      medicao_unidade?: string
    }>,
  ) {
    return pb.collection<TarefaRecord>('tarefas').update(id, data)
  },

  async deleteTarefa(id: string) {
    return pb.collection('tarefas').delete(id)
  },

  /** Endpoint do cron manual (gera atribuições recorrentes de hoje) */
  async gerarRecorrentes() {
    return pb.send('/backend/v1/atribuicoes/gerar', { method: 'POST' })
  },
}
