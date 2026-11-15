import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RecorrenciaForm, type RecorrenciaState } from '@/components/RecorrenciaForm'
import { usersService } from '@/services/users'
import { LOCAIS, LOCAL_LABELS, type LocalValue } from '@/lib/locais'
import { SETORES, SETOR_LABELS, type SetorValue } from '@/lib/setores'
import type { ConfigAdicional, UserRecord } from '@/types'
import { CalendarOff, Clock, Layers, MapPin, Plus, Repeat, Sun, Users, X } from 'lucide-react'

// ------------------------------------------------------------------
// Cabeçalho do checklist no modelo Checa Ai: Unidade, Setor, Turno,
// Recorrência, Horário e Responsável + toggle "Checklist de Pendência
// (Sem Horário)". Múltiplas combinações unidade+setor+responsável
// ficam nas "Configurações adicionais" (guardadas em locais_extra).
// ------------------------------------------------------------------

export type TurnoValor = '' | 'manha' | 'tarde' | 'noite'

export const TURNO_LABELS: Record<TurnoValor, string> = {
  '': 'Sem turno',
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}

export interface ChecklistCabecalhoState {
  local: LocalValue | ''
  setores: SetorValue[]
  turno: TurnoValor
  semHorario: boolean
}

export const cabecalhoDoProcesso = (proc: {
  local?: string
  setores?: unknown
  turno?: string
  sem_horario?: boolean
}): ChecklistCabecalhoState => {
  let setores: SetorValue[] = []
  const raw = proc.setores
  if (Array.isArray(raw)) setores = raw as SetorValue[]
  else if (typeof raw === 'string' && raw) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) setores = arr as SetorValue[]
    } catch {
      /* campo vazio ou inválido */
    }
  }
  const turno = (proc.turno || '') as TurnoValor
  return {
    local: (proc.local || '') as LocalValue | '',
    setores: setores.filter((s) => (SETORES as string[]).includes(s as string)),
    turno: ['manha', 'tarde', 'noite'].includes(turno) ? turno : '',
    semHorario: !!proc.sem_horario,
  }
}

export const configAdicionaisDoProcesso = (proc: { locais_extra?: unknown }): ConfigAdicional[] => {
  let arr: unknown[] = []
  const raw = proc.locais_extra
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === 'string' && raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed
    } catch {
      /* campo vazio ou inválido */
    }
  }
  return arr
    .filter((c): c is ConfigAdicional => !!c && typeof c === 'object')
    .map((c) => ({
      local: (c.local || '') as string,
      setor: (c.setor || '') as string,
      designados: Array.isArray(c.designados)
        ? c.designados.filter((d) => typeof d === 'string')
        : [],
    }))
}

interface Props {
  local: LocalValue | ''
  setores: SetorValue[]
  turno: TurnoValor
  semHorario: boolean
  recorrencia: RecorrenciaState
  configAdicionais: ConfigAdicional[]
  colaboradores: UserRecord[]
  onChange: (next: ChecklistCabecalhoState) => void
  onRecorrenciaChange: (next: RecorrenciaState) => void
  onConfigAdicionaisChange: (next: ConfigAdicional[]) => void
}

export const ChecklistCabecalhoForm: React.FC<Props> = ({
  local,
  setores,
  turno,
  semHorario,
  recorrencia,
  configAdicionais,
  colaboradores,
  onChange,
  onRecorrenciaChange,
  onConfigAdicionaisChange,
}) => {
  const toggleSetor = (s: SetorValue) => {
    const set = new Set(setores)
    if (set.has(s)) set.delete(s)
    else set.add(s)
    onChange({ local, setores: Array.from(set), turno, semHorario })
  }

  const addConfigAdicional = () => {
    onConfigAdicionaisChange([...configAdicionais, { local: '', setor: '', designados: [] }])
  }

  const updateConfigAdicional = (idx: number, patch: Partial<ConfigAdicional>) => {
    onConfigAdicionaisChange(configAdicionais.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeConfigAdicional = (idx: number) => {
    onConfigAdicionaisChange(configAdicionais.filter((_, i) => i !== idx))
  }

  const toggleDesignadoAdicional = (idx: number, userId: string) => {
    const atual = configAdicionais[idx]
    const set = new Set(atual.designados || [])
    if (set.has(userId)) set.delete(userId)
    else set.add(userId)
    updateConfigAdicional(idx, { designados: Array.from(set) })
  }

  const nomeColab = (cid: string) => {
    const c = colaboradores.find((x) => x.id === cid)
    return c ? c.name || c.email : cid
  }

  return (
    <div className="space-y-5">
      {/* Toggle Checklist de Pendência (Sem Horário) */}
      <div
        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
          semHorario ? 'bg-[#F3ECFA] border-[#7A5C9C]/25' : 'bg-[#FFF9F2] border-[#F2A65A]/20'
        }`}
      >
        <div>
          <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
            <CalendarOff
              className={`w-3.5 h-3.5 ${semHorario ? 'text-[#7A5C9C]' : 'text-[#E0447C]'}`}
            />
            Checklist de Pendência (Sem Horário)
          </p>
          <p className="text-[11px] text-[#8A6F6F]">
            Ative quando o checklist for uma pendência do dia, sem horário-limite: ele vale o dia
            inteiro e não aparece como “Atrasado”.
          </p>
        </div>
        <Switch
          checked={semHorario}
          onCheckedChange={(v) => onChange({ local, setores, turno, semHorario: v })}
        />
      </div>

      {/* Unidade / Setor / Turno */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E0447C]" /> Unidade
          </Label>
          <Select
            value={local || undefined}
            onValueChange={(val) =>
              onChange({ local: val as LocalValue, setores, turno, semHorario })
            }
          >
            <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {LOCAIS.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOCAL_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#E0447C]" /> Setor
          </Label>
          <Select
            value={setores[0] || undefined}
            onValueChange={(val) =>
              onChange({ local, setores: [val as SetorValue], turno, semHorario })
            }
          >
            <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold">
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {SETORES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SETOR_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {setores.length > 1 && (
            <p className="text-[11px] text-[#8A6F6F]">
              Setores adicionais salvos: {setores.slice(1).join(', ')}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B] flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-[#E0447C]" /> Turno
          </Label>
          <Select
            value={turno || undefined}
            onValueChange={(val) =>
              onChange({ local, setores, turno: val as TurnoValor, semHorario })
            }
          >
            <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold">
              <SelectValue placeholder="Selecione o turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manha">Manhã</SelectItem>
              <SelectItem value="tarde">Tarde</SelectItem>
              <SelectItem value="noite">Noite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recorrência: diária / dias da semana / semanal */}
      <RecorrenciaForm
        value={recorrencia}
        onChange={onRecorrenciaChange}
        colaboradores={colaboradores}
      />

      {/* Horário (horário-limite) — escondido quando Sem Horário */}
      {!semHorario && (
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E0447C]" /> Horário
          </Label>
          <Input
            type="time"
            value={recorrencia.horario_limite}
            onChange={(e) =>
              onRecorrenciaChange({ ...recorrencia, horario_limite: e.target.value })
            }
            className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold max-w-[200px]"
          />
          <p className="text-[11px] text-[#8A6F6F]">
            Depois dele, a tarefa aparece como “Atrasada”.
          </p>
        </div>
      )}

      {/* Responsável (designados) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B] flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#E0447C]" /> Responsável
        </Label>
        <p className="text-[11px] text-[#8A6F6F]">
          Todo dia, cada tarefa do checklist é criada automaticamente para cada responsável
          selecionado — sem precisar montar a escala manualmente.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {colaboradores.length === 0 && (
            <span className="text-xs text-[#8A6F6F]">Nenhum usuário cadastrado.</span>
          )}
          {colaboradores.map((c) => {
            const ativo = (recorrencia.designados || []).includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const set = new Set(recorrencia.designados || [])
                  if (set.has(c.id)) set.delete(c.id)
                  else set.add(c.id)
                  onRecorrenciaChange({ ...recorrencia, designados: Array.from(set) })
                }}
                className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs font-semibold transition cursor-pointer ${
                  ativo
                    ? 'bg-[#FFF3E8] border-[#E0447C]/50 text-[#3B2B2B]'
                    : 'bg-white border-[#F2A65A]/30 text-[#8A6F6F] hover:border-[#E0447C]/40'
                }`}
              >
                <Avatar className="w-6 h-6 border border-[#E0447C]/30">
                  <AvatarImage src={c.avatar ? usersService.getFileUrl(c, c.avatar) : ''} />
                  <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-[9px]">
                    {c.name ? c.name.slice(0, 2).toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                {c.name || c.email}
              </button>
            )
          })}
        </div>
      </div>

      {/* Configurações adicionais: combinações unidade + setor + responsável */}
      <div className="p-4 rounded-xl bg-[#FFF9F2]/60 border border-[#F2A65A]/25 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#E0447C]" /> Configurações adicionais
            </p>
            <p className="text-[11px] text-[#8A6F6F]">
              Adicione mais combinações de unidade + setor + responsável para o mesmo checklist. A
              rotina cria atribuições para todas elas, além do cabeçalho.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={addConfigAdicional}
            className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        {configAdicionais.length === 0 ? (
          <p className="text-[11px] text-[#8A6F6F] italic">
            Nenhuma configuração adicional — o checklist vale para a unidade, setor e responsáveis
            do cabeçalho.
          </p>
        ) : (
          <div className="space-y-3">
            {configAdicionais.map((cfg, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-[#F2A65A]/25 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#8A6F6F] uppercase tracking-wider">
                    Combinação {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeConfigAdicional(idx)}
                    title="Remover combinação"
                    className="p-1.5 rounded-lg text-[#8A6F6F] hover:text-[#E5484D] hover:bg-[#FFF3F3] transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-[#3B2B2B]">Unidade</Label>
                    <Select
                      value={cfg.local || undefined}
                      onValueChange={(val) => updateConfigAdicional(idx, { local: val })}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-sm font-semibold">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCAIS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {LOCAL_LABELS[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-[#3B2B2B]">Setor</Label>
                    <Select
                      value={cfg.setor || undefined}
                      onValueChange={(val) => updateConfigAdicional(idx, { setor: val })}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-sm font-semibold">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {SETORES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SETOR_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#3B2B2B]">
                    Responsáveis desta combinação
                  </Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {colaboradores.map((c) => {
                      const ativo = (cfg.designados || []).includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleDesignadoAdicional(idx, c.id)}
                          className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs font-semibold transition cursor-pointer ${
                            ativo
                              ? 'bg-[#FFF3E8] border-[#E0447C]/50 text-[#3B2B2B]'
                              : 'bg-white border-[#F2A65A]/30 text-[#8A6F6F] hover:border-[#E0447C]/40'
                          }`}
                        >
                          <Avatar className="w-6 h-6 border border-[#E0447C]/30">
                            <AvatarImage
                              src={c.avatar ? usersService.getFileUrl(c, c.avatar) : ''}
                            />
                            <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-[9px]">
                              {c.name ? c.name.slice(0, 2).toUpperCase() : '?'}
                            </AvatarFallback>
                          </Avatar>
                          {c.name || c.email}
                        </button>
                      )
                    })}
                  </div>
                  {(cfg.designados || []).length > 0 && (
                    <p className="text-[11px] text-[#8A6F6F]">
                      {(cfg.designados || []).length === 1
                        ? `1 responsável: ${nomeColab(cfg.designados![0])}`
                        : `${cfg.designados!.length} responsáveis selecionados`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo do cabeçalho */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-[#8A6F6F]">
        <Repeat className="w-3 h-3" />
        <span>
          {recorrencia.recorrencia === 'nenhuma'
            ? 'Escala manual'
            : recorrencia.recorrencia === 'diaria'
              ? 'Todos os dias'
              : recorrencia.recorrencia === 'semanal'
                ? 'Semanal (segunda)'
                : `${recorrencia.dias_semana.length} dia(s) da semana`}
        </span>
        {semHorario ? (
          <span className="text-[#7A5C9C]">· sem horário (pendência)</span>
        ) : recorrencia.horario_limite ? (
          <span>· limite {recorrencia.horario_limite}</span>
        ) : null}
        <span>· {recorrencia.designados.length} responsável(is)</span>
        {configAdicionais.length > 0 && (
          <span>· {configAdicionais.length} configuração(ões) adicional(is)</span>
        )}
        {local && <span>· {LOCAL_LABELS[local]}</span>}
        {setores.length > 0 && <span>· setor {setores.join(', ')}</span>}
        {turno && <span>· turno {TURNO_LABELS[turno]}</span>}
      </div>
    </div>
  )
}
