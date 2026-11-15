import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  FileQuestion,
  GripVertical,
  Plus,
  Trash2,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TarefaRecord } from '@/types'
import { evidenciaDaTarefa, type Evidencia } from '@/lib/evidencia'

// ------------------------------------------------------------------
// Atividades como linhas (modelo Checa Ai): cada tarefa é uma linha
// com alça de reordenar, marcador de item crítico, indicador de
// evidência (5 tipos) e expansão para editar/excluir.
// ------------------------------------------------------------------

export const EVIDENCIA_LABELS: Record<Evidencia, string> = {
  nenhuma: 'Sem registro',
  foto_obrigatoria: 'Foto obrigatória',
  foto_opcional: 'Foto opcional',
  video_obrigatorio: 'Vídeo obrigatório',
  video_opcional: 'Vídeo opcional',
}

const EvidenciaIcone: React.FC<{ evid: Evidencia; className?: string }> = ({ evid, className }) => {
  if (evid === 'foto_obrigatoria' || evid === 'foto_opcional')
    return <Camera className={cn('w-3.5 h-3.5', className)} />
  if (evid === 'video_obrigatorio' || evid === 'video_opcional')
    return <Video className={cn('w-3.5 h-3.5', className)} />
  if (evid === 'nenhuma') return <Check className={cn('w-3.5 h-3.5', className)} />
  return <FileQuestion className={cn('w-3.5 h-3.5', className)} />
}

const EvidenciaChip: React.FC<{ evid: Evidencia }> = ({ evid }) => {
  const obrigatoria = evid === 'foto_obrigatoria' || evid === 'video_obrigatorio'
  const cor = evid.startsWith('foto')
    ? 'text-[#E0447C] bg-[#E0447C]/10 border-[#E0447C]/25'
    : evid.startsWith('video')
      ? 'text-[#7A5C9C] bg-[#7A5C9C]/10 border-[#7A5C9C]/25'
      : 'text-[#8A6F6F] bg-[#FFF9F2] border-[#F2A65A]/25'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap',
        cor,
      )}
      title={EVIDENCIA_LABELS[evid]}
    >
      <EvidenciaIcone evid={evid} />
      {EVIDENCIA_LABELS[evid]}
      {obrigatoria && <AlertTriangle className="w-3 h-3" />}
    </span>
  )
}

interface Props {
  tarefas: TarefaRecord[]
  salvandoTarefaId: string | null
  onReorder: (tarefas: TarefaRecord[]) => void
  onUpdate: (tarefaId: string, patch: Partial<TarefaRecord>) => Promise<void> | void
  onDelete: (tarefaId: string) => Promise<void> | void
  onAdd: () => void
}

export const TarefasLinhas: React.FC<Props> = ({
  tarefas,
  salvandoTarefaId,
  onReorder,
  onUpdate,
  onDelete,
  onAdd,
}) => {
  const [expandida, setExpandida] = React.useState<string | null>(null)
  const [arrastando, setArrastando] = React.useState<number | null>(null)
  const [ordem, setOrdem] = React.useState<number[]>(() => tarefas.map((_, i) => i))

  React.useEffect(() => {
    setOrdem(tarefas.map((_, i) => i))
  }, [tarefas.length])

  const dropOn = (destino: number) => {
    if (arrastando === null || arrastando === destino) {
      setArrastando(null)
      return
    }
    const novaOrdem = [...ordem]
    const [movido] = novaOrdem.splice(arrastando, 1)
    novaOrdem.splice(destino, 0, movido)
    setOrdem(novaOrdem)
    setArrastando(null)
    onReorder(novaOrdem.map((i) => tarefas[i]).filter(Boolean))
  }

  return (
    <div className="space-y-2">
      {ordem.map((idx, pos) => {
        const t = tarefas[idx]
        if (!t) return null
        const evid = evidenciaDaTarefa(t)
        const critica = !!t.critica
        const aberta = expandida === t.id
        return (
          <div
            key={t.id}
            draggable
            onDragStart={() => setArrastando(pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropOn(pos)}
            className={cn(
              'rounded-xl border bg-white transition shadow-sm',
              arrastando === pos
                ? 'border-[#E0447C] opacity-60'
                : 'border-[#F2A65A]/25 hover:border-[#F2A65A]/50',
            )}
          >
            {/* Linha (colapsada) */}
            <div className="flex items-center gap-2 px-2 py-2">
              <GripVertical className="w-4 h-4 text-[#C9B3B3] cursor-grab shrink-0" />
              {/* Toggle crítico */}
              <button
                type="button"
                title={critica ? 'Item crítico (clique para remover)' : 'Marcar como item crítico'}
                onClick={() => onUpdate(t.id, { critica: !critica })}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center border transition cursor-pointer shrink-0',
                  critica
                    ? 'bg-[#E5484D]/10 border-[#E5484D]/40 text-[#E5484D]'
                    : 'bg-[#FFF9F2] border-[#F2A65A]/30 text-transparent hover:text-[#E5484D]/40',
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
              {/* Indicador de evidência */}
              <button
                type="button"
                title="Clique para alternar o tipo de evidência"
                onClick={() => {
                  const seq: Evidencia[] = [
                    'nenhuma',
                    'foto_obrigatoria',
                    'foto_opcional',
                    'video_obrigatorio',
                    'video_opcional',
                  ]
                  const prox = seq[(seq.indexOf(evid) + 1) % seq.length]
                  const patch: Partial<TarefaRecord> =
                    prox === 'nenhuma'
                      ? { tipo_registro: 'nenhum', evidencia_obrigatoria: false }
                      : prox.startsWith('foto')
                        ? {
                            tipo_registro: 'foto',
                            evidencia_obrigatoria: prox === 'foto_obrigatoria',
                          }
                        : {
                            tipo_registro: 'video',
                            evidencia_obrigatoria: prox === 'video_obrigatorio',
                          }
                  onUpdate(t.id, patch)
                }}
                className="cursor-pointer shrink-0"
              >
                <EvidenciaChip evid={evid} />
              </button>
              {/* Título + descrição curta */}
              <button
                type="button"
                onClick={() => setExpandida(aberta ? null : t.id)}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <span
                  className={cn(
                    'block text-sm font-semibold truncate',
                    critica ? 'text-[#E5484D]' : 'text-[#3B2B2B]',
                  )}
                >
                  {t.titulo}
                </span>
                {t.descricao && !aberta && (
                  <span className="block text-[11px] text-[#8A6F6F] truncate">{t.descricao}</span>
                )}
              </button>
              {/* Expandir / excluir */}
              <button
                type="button"
                title={aberta ? 'Recolher' : 'Editar'}
                onClick={() => setExpandida(aberta ? null : t.id)}
                className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E0447C] hover:bg-[#FFF3E8] transition cursor-pointer shrink-0"
              >
                <ChevronDown className={cn('w-4 h-4 transition', aberta && 'rotate-180')} />
              </button>
              <button
                type="button"
                title="Excluir tarefa"
                onClick={() => {
                  if (window.confirm(`Excluir a tarefa "${t.titulo}"?`)) onDelete(t.id)
                }}
                className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E5484D] hover:bg-[#FFF3F3] transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Expandido: editar título, descrição e evidência */}
            {aberta && (
              <div className="px-3 pb-3 pt-1 border-t border-[#F2A65A]/20 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#3B2B2B]">Título</Label>
                  <Input
                    defaultValue={t.titulo}
                    onBlur={(e) =>
                      e.target.value.trim() !== t.titulo &&
                      onUpdate(t.id, { titulo: e.target.value.trim() })
                    }
                    className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#3B2B2B]">Descrição</Label>
                  <Textarea
                    defaultValue={t.descricao || ''}
                    rows={2}
                    onBlur={(e) =>
                      (e.target.value || '') !== (t.descricao || '') &&
                      onUpdate(t.id, { descricao: e.target.value })
                    }
                    className="rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#3B2B2B]">Evidência</Label>
                  <Select
                    value={evid}
                    onValueChange={(val: Evidencia) => {
                      const patch: Partial<TarefaRecord> =
                        val === 'nenhuma'
                          ? { tipo_registro: 'nenhum', evidencia_obrigatoria: false }
                          : val.startsWith('foto')
                            ? {
                                tipo_registro: 'foto',
                                evidencia_obrigatoria: val === 'foto_obrigatoria',
                              }
                            : {
                                tipo_registro: 'video',
                                evidencia_obrigatoria: val === 'video_obrigatorio',
                              }
                      onUpdate(t.id, patch)
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          'nenhuma',
                          'foto_obrigatoria',
                          'foto_opcional',
                          'video_obrigatorio',
                          'video_opcional',
                        ] as Evidencia[]
                      ).map((v) => (
                        <SelectItem key={v} value={v}>
                          {EVIDENCIA_LABELS[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`critica-${t.id}`}
                      checked={critica}
                      onCheckedChange={(v) => onUpdate(t.id, { critica: v })}
                    />
                    <Label
                      htmlFor={`critica-${t.id}`}
                      className="text-[11px] font-bold text-[#3B2B2B]"
                    >
                      Item crítico
                    </Label>
                  </div>
                  {salvandoTarefaId === t.id && (
                    <span className="text-[11px] text-[#8A6F6F]">Salvando…</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full rounded-xl border-dashed border-[#F2A65A]/50 text-[#E0447C] font-bold hover:bg-[#FFF3E8]"
      >
        <Plus className="w-4 h-4 mr-1.5" /> Adicionar tarefa
      </Button>
    </div>
  )
}
