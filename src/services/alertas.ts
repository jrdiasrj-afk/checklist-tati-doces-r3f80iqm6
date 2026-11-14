import pb from '@/lib/pocketbase/client'
import type { AlertaRecord, AlertaTipo, LocalValue } from '@/types'

export interface AlertaFilters {
  local?: LocalValue | 'todos' | '' // 'todos' ou vazio = todos os locais
}

export const alertasService = {
  /** Lista alertas (fora_prazo / fim_dia), opcionalmente filtrando por local */
  async list(filters?: AlertaFilters): Promise<AlertaRecord[]> {
    const parts: string[] = []
    if (filters?.local && filters.local !== 'todos') {
      parts.push(`local = '${filters.local}'`)
    }
    return pb.collection<AlertaRecord>('alertas').getFullList({
      filter: parts.length ? parts.join(' && ') : undefined,
      sort: '-criado_em',
      expand: 'colaborador,supervisor,atribuicao',
    })
  },

  /** Dispara a verificação manual de alertas (fora_prazo) — uso do gerente */
  async verificar(): Promise<{ fora_prazo: number }> {
    const res = await pb.send('/backend/v1/alertas/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    return res as { fora_prazo: number }
  },

  tipoLabel(tipo: AlertaTipo): string {
    return tipo === 'fora_prazo' ? 'Fora do prazo' : 'Fim do dia'
  },
}
