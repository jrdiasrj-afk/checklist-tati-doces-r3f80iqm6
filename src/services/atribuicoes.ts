import pb from '@/lib/pocketbase/client'
import type { AtribuicaoRecord, AtribuicaoStatus } from '@/types'

export const atribuicoesService = {
  async listByDate(dateStr: string, colaboradorId?: string) {
    const cleanDate = dateStr.split('T')[0]
    const parts = [`data >= '${cleanDate} 00:00:00.000Z'`, `data <= '${cleanDate} 23:59:59.999Z'`]

    if (colaboradorId) {
      parts.push(`colaborador = '${colaboradorId}'`)
    }

    return pb.collection<AtribuicaoRecord>('atribuicoes').getFullList({
      filter: parts.join(' && '),
      sort: 'tarefa.ordem',
      expand: 'tarefa,tarefa.processo,colaborador',
    })
  },

  async listRange(
    startDate: string,
    endDate: string,
    filters?: { colaboradorId?: string; status?: string },
  ) {
    const startClean = startDate.split('T')[0]
    const endClean = endDate.split('T')[0]
    const parts = [`data >= '${startClean} 00:00:00.000Z'`, `data <= '${endClean} 23:59:59.999Z'`]

    if (filters?.colaboradorId && filters.colaboradorId !== 'todos') {
      parts.push(`colaborador = '${filters.colaboradorId}'`)
    }
    if (filters?.status && filters.status !== 'todos') {
      parts.push(`status = '${filters.status}'`)
    }

    return pb.collection<AtribuicaoRecord>('atribuicoes').getFullList({
      filter: parts.join(' && '),
      sort: '-data,tarefa.ordem',
      expand: 'tarefa,tarefa.processo,colaborador',
    })
  },

  async updateStatus(
    id: string,
    payload: {
      status: AtribuicaoStatus
      observacao?: string
      fotoFile?: File | null
      concluida_em?: string
      medicao_valor?: number
      fora_padrao?: boolean
    },
  ) {
    const temAnexo = !!payload.fotoFile
    if (temAnexo) {
      const formData = new FormData()
      formData.append('status', payload.status)
      if (payload.observacao !== undefined) formData.append('observacao', payload.observacao)
      if (payload.concluida_em) formData.append('concluida_em', payload.concluida_em)
      if (payload.medicao_valor !== undefined)
        formData.append('medicao_valor', String(payload.medicao_valor))
      if (payload.fora_padrao !== undefined)
        formData.append('fora_padrao', String(payload.fora_padrao))
      formData.append('foto', payload.fotoFile)
      return pb.collection<AtribuicaoRecord>('atribuicoes').update(id, formData)
    }

    return pb.collection<AtribuicaoRecord>('atribuicoes').update(id, {
      status: payload.status,
      observacao: payload.observacao,
      concluida_em: payload.concluida_em,
      medicao_valor: payload.medicao_valor,
      fora_padrao: payload.fora_padrao,
    })
  },

  async delete(id: string) {
    return pb.collection('atribuicoes').delete(id)
  },

  async bulkAssign(data: { processo_id: string; colaborador_id: string; datas: string[] }) {
    const res = await pb.send('/backend/v1/atribuicoes/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return res as {
      success: boolean
      criadas: number
      ignoradas: number
      total_tarefas: number
      datas_processadas: number
    }
  },
}
