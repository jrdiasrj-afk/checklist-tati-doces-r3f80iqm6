/** Setores da Tati Doces (replicados do sistema antigo Checa Ai) */
export type SetorValue =
  | 'Batida'
  | 'Cozinha'
  | 'Gerência'
  | 'Produção'
  | 'Estoque'
  | 'Caixa'
  | 'Salão/Atendimento'
  | 'Recheios'

export const SETORES: SetorValue[] = [
  'Batida',
  'Cozinha',
  'Gerência',
  'Produção',
  'Estoque',
  'Caixa',
  'Salão/Atendimento',
  'Recheios',
]

export const SETOR_LABELS: Record<SetorValue, string> = {
  Batida: 'Batida',
  Cozinha: 'Cozinha',
  Gerência: 'Gerência',
  Produção: 'Produção',
  Estoque: 'Estoque',
  Caixa: 'Caixa',
  'Salão/Atendimento': 'Salão/Atendimento',
  Recheios: 'Recheios',
}

/** Cor de destaque por setor (badge/filtro) */
export const SETOR_COLORS: Record<SetorValue, string> = {
  Batida: '#B77A0A',
  Cozinha: '#E0447C',
  Gerência: '#3B7A9C',
  Produção: '#2D7A51',
  Estoque: '#7C5CBF',
  Caixa: '#C2571A',
  'Salão/Atendimento': '#2E8B8B',
  Recheios: '#A8467C',
}

export function setorLabel(setor?: string | null): string {
  if (!setor) return '—'
  return SETOR_LABELS[setor as SetorValue] ?? setor
}

export function isSetorValue(v: string): v is SetorValue {
  return SETORES.includes(v as SetorValue)
}
