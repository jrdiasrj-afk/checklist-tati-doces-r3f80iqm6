import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { processosService } from '@/services/processos'
import type { ProcessoRecord, AreaProcesso } from '@/types'
import { AreaBadge } from '@/components/AreaBadge'
import {
  LOCAIS,
  LOCAL_LABELS,
  LOCAL_COLORS,
  localLabel,
  isLocalValue,
  type LocalValue,
} from '@/lib/locais'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  RecorrenciaForm,
  recorrenciaDoProcesso,
  recorrenciaInicial,
  resumoRecorrencia,
  type RecorrenciaState,
} from '@/components/RecorrenciaForm'
import { usersService } from '@/services/users'
import type { UserRecord } from '@/types'
import { Repeat, Users } from 'lucide-react'
import { Plus, Search, ChevronRight, Layers, X, Sparkles } from 'lucide-react'

export default function Processos() {
  const navigate = useNavigate()
  const [processos, setProcessos] = useState<ProcessoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form novo processo
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [area, setArea] = useState<AreaProcesso>('Loja')
  const [local, setLocal] = useState<LocalValue | ''>('')
  const [ativo, setAtivo] = useState(true)
  const [recorrencia, setRecorrencia] = useState<RecorrenciaState>(recorrenciaInicial)
  const [colaboradores, setColaboradores] = useState<UserRecord[]>([])
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await processosService.list({ search })
      setProcessos(data)
    } catch (err) {
      toast.error('Erro ao carregar processos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    usersService
      .list()
      .then(setColaboradores)
      .catch(() => {})
  }, [search])

  const handleToggleAtivo = async (proc: ProcessoRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await processosService.update(proc.id, { ativo: !proc.ativo })
      setProcessos((prev) =>
        prev.map((p) => (p.id === proc.id ? { ...p, ativo: updated.ativo } : p)),
      )
      toast.success(`Processo ${updated.ativo ? 'ativado' : 'desativado'} com sucesso!`)
    } catch (err) {
      toast.error('Não foi possível alterar o status do processo.')
    }
  }

  const handleCreateProcesso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Informe o nome do processo.')
      return
    }

    setSaving(true)
    try {
      const novo = await processosService.create({
        nome: nome.trim(),
        descricao: descricao.trim(),
        area,
        local: local || '',
        ativo,
        recorrencia: recorrencia.recorrencia,
        dias_semana: recorrencia.recorrencia === 'dias_semana' ? recorrencia.dias_semana : [],
        horario_limite: recorrencia.horario_limite || '',
        vigencia: recorrencia.vigencia || '',
        designados: recorrencia.designados,
      })
      toast.success('Processo criado com sucesso!')
      setIsModalOpen(false)
      setNome('')
      setDescricao('')
      setArea('Loja')
      setLocal('')
      setAtivo(true)
      setRecorrencia(recorrenciaInicial)
      // Redireciona diretamente para cadastrar tarefas
      navigate(`/processos/${novo.id}`)
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Erro ao criar processo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout
      title="Gestão de Processos"
      actions={
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold shadow-sm text-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Novo Processo
        </Button>
      }
    >
      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-2xl border border-[#F2A65A]/20 shadow-xs mb-6 flex items-center gap-3">
        <Search className="w-4 h-4 text-[#8A6F6F]" />
        <Input
          type="text"
          placeholder="Buscar processo por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0 text-sm p-0 h-auto"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-[#8A6F6F] hover:text-[#E0447C] cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Grade de Cartões */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-white animate-pulse border border-[#F2A65A]/20"
            />
          ))}
        </div>
      ) : processos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#F2A65A]/20 shadow-xs">
          <span className="text-5xl">📋</span>
          <h3 className="text-lg font-display font-bold text-[#3B2B2B] mt-3">
            Nenhum processo cadastrado
          </h3>
          <p className="text-sm text-[#8A6F6F] mt-1">
            Crie processos com checklists para a sua equipe executar.
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold"
          >
            + Criar Primeiro Processo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {processos.map((proc) => (
            <div
              key={proc.id}
              onClick={() => navigate(`/processos/${proc.id}`)}
              className="bg-white rounded-3xl p-6 border border-[#F2A65A]/20 shadow-[0_4px_16px_rgba(59,43,43,0.04)] hover:shadow-[0_8px_24px_rgba(224,68,124,0.12)] transition-all cursor-pointer flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AreaBadge area={proc.area} />
                    {isLocalValue(proc.local) && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          LOCAL_COLORS[proc.local].bg
                        } ${LOCAL_COLORS[proc.local].text} ${LOCAL_COLORS[proc.local].border}`}
                      >
                        {localLabel(proc.local)}
                      </span>
                    )}
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2"
                    title={proc.ativo ? 'Processo ativo' : 'Processo inativo'}
                  >
                    <span className="text-[11px] font-semibold text-[#8A6F6F]">
                      {proc.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <Switch
                      checked={proc.ativo}
                      onCheckedChange={() => handleToggleAtivo(proc, {} as any)}
                    />
                  </div>
                </div>

                <h3 className="text-xl font-display font-bold text-[#3B2B2B] group-hover:text-[#E0447C] transition-colors leading-snug">
                  {proc.nome}
                </h3>

                {proc.descricao && (
                  <p className="text-xs text-[#8A6F6F] mt-2 line-clamp-2 leading-relaxed">
                    {proc.descricao}
                  </p>
                )}
                {proc.recorrencia && proc.recorrencia !== 'nenhuma' && (
                  <p className="text-[11px] font-semibold text-[#E0447C] mt-2 flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {resumoRecorrencia(recorrenciaDoProcesso(proc))}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#F2A65A]/15 flex items-center justify-between text-xs font-semibold text-[#8A6F6F]">
                <span className="flex items-center gap-1.5 text-[#3B2B2B]">
                  <Layers className="w-4 h-4 text-[#F2A65A]" /> Ver Tarefas
                </span>
                <span className="flex items-center gap-1 text-[#E0447C] group-hover:translate-x-1 transition-transform">
                  Configurar <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL NOVO PROCESSO ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#F2A65A]/20 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-1 rounded-full text-[#8A6F6F] hover:bg-[#FFF3E8] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-[#FFF3E8] text-[#E0447C]">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-display font-bold text-[#3B2B2B]">Novo Processo</h2>
            </div>
            <p className="text-xs text-[#8A6F6F] mb-6">
              Defina a rotina operacional para a equipe da confeitaria.
            </p>

            <form onSubmit={handleCreateProcesso} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="nome"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Nome do Processo *
                </Label>
                <Input
                  id="nome"
                  required
                  placeholder="Ex.: Abertura do Balcão"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="local"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Local de operação
                </Label>
                <Select value={local} onValueChange={(val) => setLocal(val as LocalValue)}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]">
                    <SelectValue placeholder="Selecione o local (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCAIS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LOCAL_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#8A6F6F]">
                  Unidade onde este checklist é executado. Usado nos filtros e alertas.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="area"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Área / Setor *
                </Label>
                <Select value={area} onValueChange={(val: AreaProcesso) => setArea(val)}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Loja">Loja</SelectItem>
                    <SelectItem value="Cozinha">Cozinha</SelectItem>
                    <SelectItem value="Caixa">Caixa</SelectItem>
                    <SelectItem value="Limpeza">Limpeza</SelectItem>
                    <SelectItem value="Estoque">Estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="descricao"
                  className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]"
                >
                  Descrição / Orientações (opcional)
                </Label>
                <Textarea
                  id="descricao"
                  rows={3}
                  placeholder="Explique o objetivo geral deste checklist..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F2] border border-[#F2A65A]/20">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B]">Processo Ativo</p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    Disponível para inclusão na escala diária
                  </p>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>

              {/* Recorrência (estilo Koncluí) */}
              <div className="p-4 rounded-xl bg-[#FFF9F2] border border-[#F2A65A]/20 space-y-4">
                <div>
                  <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-[#E0447C]" /> Rotina Recorrente
                  </p>
                  <p className="text-[11px] text-[#8A6F6F]">
                    Com frequência e horário-limite definidos, as tarefas aparecem sozinhas no
                    celular da equipe a cada dia.
                  </p>
                </div>
                <RecorrenciaForm
                  value={recorrencia}
                  onChange={setRecorrencia}
                  colaboradores={colaboradores}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border-[#F2A65A]/40 text-[#3B2B2B] text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white text-xs font-bold px-6"
                >
                  {saving ? 'Criando...' : 'Criar e Adicionar Tarefas'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
