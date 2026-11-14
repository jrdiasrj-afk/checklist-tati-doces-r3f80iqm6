import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { RecorrenciaTipo, UserRecord } from '@/types'
import { usersService } from '@/services/users'

const DIAS = [
  { valor: 1, letra: 'S', nome: 'Segunda' },
  { valor: 2, letra: 'T', nome: 'Terça' },
  { valor: 3, letra: 'Q', nome: 'Quarta' },
  { valor: 4, letra: 'Q', nome: 'Quinta' },
  { valor: 5, letra: 'S', nome: 'Sexta' },
  { valor: 6, letra: 'S', nome: 'Sábado' },
  { valor: 0, letra: 'D', nome: 'Domingo' },
]

export interface RecorrenciaState {
  recorrencia: RecorrenciaTipo
  dias_semana: number[]
  horario_limite: string
  vigencia: string
  designados: string[]
}

export const recorrenciaInicial: RecorrenciaState = {
  recorrencia: 'nenhuma',
  dias_semana: [1, 2, 3, 4, 5, 6],
  horario_limite: '',
  vigencia: '',
  designados: [],
}

export function recorrenciaDoProcesso(proc: {
  recorrencia?: RecorrenciaTipo
  dias_semana?: number[]
  horario_limite?: string
  vigencia?: string
  designados?: string[]
}): RecorrenciaState {
  return {
    recorrencia: proc.recorrencia || 'nenhuma',
    dias_semana: proc.dias_semana?.length ? proc.dias_semana : [1, 2, 3, 4, 5, 6],
    horario_limite: proc.horario_limite || '',
    vigencia: proc.vigencia ? proc.vigencia.split(' ')[0].split('T')[0] : '',
    designados: proc.designados || [],
  }
}

/** Resumo legível da recorrência (ex.: "Seg a Sáb · limite 08:00") */
export function resumoRecorrencia(r: RecorrenciaState): string {
  if (r.recorrencia === 'nenhuma') return 'Escala manual'
  const partes: string[] = []
  if (r.recorrencia === 'diaria') partes.push('Todos os dias')
  else if (r.recorrencia === 'semanal') partes.push('Semanal (segunda)')
  else if (r.recorrencia === 'dias_semana') {
    const ordenados = [...r.dias_semana].sort()
    if (ordenados.length === 7) partes.push('Todos os dias')
    else if (ordenados.length === 0) partes.push('Nenhum dia')
    else if (ordenados.join(',') === '1,2,3,4,5,6') partes.push('Seg a Sáb')
    else if (ordenados.join(',') === '1,2,3,4,5') partes.push('Seg a Sex')
    else
      partes.push(
        ordenados
          .map((d) => DIAS.find((x) => x.valor === d)?.nome.slice(0, 3))
          .filter(Boolean)
          .join(', '),
      )
  }
  if (r.horario_limite) partes.push(`limite ${r.horario_limite}`)
  const n = r.designados.length
  if (n > 0) partes.push(n === 1 ? '1 responsável' : `${n} responsáveis`)
  return partes.join(' · ')
}

interface Props {
  value: RecorrenciaState
  onChange: (next: RecorrenciaState) => void
  colaboradores: UserRecord[]
}

export const RecorrenciaForm: React.FC<Props> = ({ value, onChange, colaboradores }) => {
  const toggleDia = (d: number) => {
    const set = new Set(value.dias_semana)
    if (set.has(d)) set.delete(d)
    else set.add(d)
    onChange({ ...value, dias_semana: Array.from(set) })
  }

  const toggleColab = (id: string) => {
    const set = new Set(value.designados)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange({ ...value, designados: Array.from(set) })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
            Frequência
          </Label>
          <Select
            value={value.recorrencia}
            onValueChange={(val: RecorrenciaTipo) => onChange({ ...value, recorrencia: val })}
          >
            <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhuma">Nenhuma (escala manual)</SelectItem>
              <SelectItem value="diaria">Todos os dias</SelectItem>
              <SelectItem value="dias_semana">Dias da semana</SelectItem>
              <SelectItem value="semanal">Semanal (segunda)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
            Horário-limite
          </Label>
          <Input
            type="time"
            value={value.horario_limite}
            onChange={(e) => onChange({ ...value, horario_limite: e.target.value })}
            className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold"
          />
          <p className="text-[11px] text-[#8A6F6F]">
            Depois dele, a tarefa aparece como “Atrasada”.
          </p>
        </div>
      </div>

      {value.recorrencia === 'dias_semana' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
            Dias da Semana
          </Label>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d) => {
              const ativo = value.dias_semana.includes(d.valor)
              return (
                <button
                  key={d.valor}
                  type="button"
                  title={d.nome}
                  onClick={() => toggleDia(d.valor)}
                  className={`w-10 h-10 rounded-full text-xs font-bold border transition cursor-pointer ${
                    ativo
                      ? 'bg-[#E0447C] border-[#E0447C] text-white shadow-sm'
                      : 'bg-white border-[#F2A65A]/40 text-[#8A6F6F] hover:border-[#E0447C]/50'
                  }`}
                >
                  {d.letra}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
          Vigência inicial (opcional)
        </Label>
        <Input
          type="date"
          value={value.vigencia}
          onChange={(e) => onChange({ ...value, vigencia: e.target.value })}
          className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm font-semibold"
        />
        <p className="text-[11px] text-[#8A6F6F]">
          A rotina só passa a gerar tarefas a partir desta data.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
          Responsáveis designados
        </Label>
        <p className="text-[11px] text-[#8A6F6F]">
          Toda dia, cada tarefa do processo é criada automaticamente para cada responsável
          selecionado — sem precisar montar a escala manualmente.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {colaboradores.length === 0 && (
            <span className="text-xs text-[#8A6F6F]">Nenhum usuário cadastrado.</span>
          )}
          {colaboradores.map((c) => {
            const ativo = value.designados.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColab(c.id)}
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
    </div>
  )
}
