export type UserRole = 'gerente' | 'colaborador'

import type { LocalValue } from '@/lib/locais'
export type { LocalValue }

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
  role: UserRole
  pin?: string
  local?: LocalValue | ''
  supervisor?: string
  ultimo_acesso?: string
  created: string
  updated: string
}

export type AreaProcesso = 'Cozinha' | 'Loja' | 'Caixa' | 'Limpeza' | 'Estoque'

export type RecorrenciaTipo = 'nenhuma' | 'diaria' | 'dias_semana' | 'semanal'
export type TipoRegistro = 'nenhum' | 'foto' | 'medicao' | 'texto'

export interface ProcessoRecord {
  id: string
  nome: string
  descricao?: string
  area: AreaProcesso
  ativo: boolean
  criado_por?: string
  local?: LocalValue
  recorrencia?: RecorrenciaTipo
  dias_semana?: number[] // 0=dom ... 6=sáb
  horario_limite?: string // 'HH:mm'
  vigencia?: string
  designados?: string[]
  created: string
  updated: string
  // Campos expandidos
  expand?: {
    criado_por?: UserRecord
    tarefas?: TarefaRecord[]
    designados?: UserRecord[]
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
  critica?: boolean
  tipo_registro?: TipoRegistro
  medicao_alvo?: number
  medicao_max?: number
  medicao_unidade?: string
  created: string
  updated: string
  expand?: {
    processo?: ProcessoRecord
  }
}

export type AtribuicaoStatus = 'pendente' | 'concluida' | 'nao_aplicavel'

/** Veredito da conferência IA da foto de evidência (fiscal-foto) */
export type FotoVeredito = 'aprovado' | 'duvidoso' | 'reprovado' | 'erro'

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
  horario_limite?: string
  medicao_valor?: number
  fora_padrao?: boolean
  foto_veredito?: FotoVeredito | ''
  foto_comentario?: string
  foto_conferida_em?: string
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

export type AlertaTipo = 'fora_prazo' | 'fim_dia'

export interface AlertaRecord extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  colaborador: string
  supervisor?: string
  atribuicao: string
  local?: LocalValue
  tipo: AlertaTipo
  mensagem?: string
  criado_em: string
  created: string
  updated: string
  expand?: {
    colaborador?: UserRecord
    supervisor?: UserRecord
    atribuicao?: AtribuicaoRecord
  }
  [key: string]: any
}
