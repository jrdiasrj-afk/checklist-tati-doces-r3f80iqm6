export type UserRole = 'gerente' | 'colaborador'

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
  role: UserRole
  created: string
  updated: string
}

export type AreaProcesso = 'Cozinha' | 'Loja' | 'Caixa' | 'Limpeza' | 'Estoque'

export interface ProcessoRecord {
  id: string
  nome: string
  descricao?: string
  area: AreaProcesso
  ativo: boolean
  criado_por?: string
  created: string
  updated: string
  // Campos expandidos
  expand?: {
    criado_por?: UserRecord
    tarefas?: TarefaRecord[]
  }
}

export interface TarefaRecord {
  id: string
  processo: string
  titulo: string
  descricao?: string
  ordem: number
  evidencia_obrigatoria: boolean
  ativa: boolean
  created: string
  updated: string
  expand?: {
    processo?: ProcessoRecord
  }
}

export type AtribuicaoStatus = 'pendente' | 'concluida' | 'nao_aplicavel'

import type { RecordModel } from 'pocketbase'

export interface AtribuicaoRecord extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  tarefa: string
  colaborador: string
  data: string
  status: AtribuicaoStatus
  concluida_em?: string
  observacao?: string
  foto?: string
  created: string
  updated: string
  expand?: {
    tarefa?: TarefaRecord & {
      expand?: {
        processo?: ProcessoRecord
      }
    }
    colaborador?: UserRecord
  }
  [key: string]: any
}
