import type { TarefaRecord, TipoRegistro } from '@/types'

/** As 5 opções de evidência da UI (modelo Checa Ai) */
export type Evidencia =
  | 'nenhuma'
  | 'foto_obrigatoria'
  | 'foto_opcional'
  | 'video_obrigatorio'
  | 'video_opcional'

/** Mapeia os campos da tarefa (tipo_registro + evidencia_obrigatoria) numa das 5 opções */
export const evidenciaDaTarefa = (
  t: Pick<TarefaRecord, 'tipo_registro' | 'evidencia_obrigatoria'>,
): Evidencia => {
  const tipo = (t.tipo_registro || 'nenhum') as TipoRegistro
  const obrigatoria = !!t.evidencia_obrigatoria
  if (tipo === 'video') return obrigatoria ? 'video_obrigatorio' : 'video_opcional'
  if (tipo === 'foto' || obrigatoria) return obrigatoria ? 'foto_obrigatoria' : 'foto_opcional'
  return 'nenhuma'
}

/** A tarefa PEDE foto/vídeo (pode ser anexado ao concluir)? */
export const tarefaPedeMidia = (
  t: Pick<TarefaRecord, 'tipo_registro' | 'evidencia_obrigatoria'>,
): boolean => {
  const tipo = (t.tipo_registro || 'nenhum') as TipoRegistro
  return tipo === 'foto' || tipo === 'video' || !!t.evidencia_obrigatoria
}

/** A tarefa EXIGE foto/vídeo para ser concluída? */
export const tarefaExigeMidia = (
  t: Pick<TarefaRecord, 'tipo_registro' | 'evidencia_obrigatoria'>,
): boolean => {
  const tipo = (t.tipo_registro || 'nenhum') as TipoRegistro
  return (tipo === 'foto' || tipo === 'video') && !!t.evidencia_obrigatoria
}
