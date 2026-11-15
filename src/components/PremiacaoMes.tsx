import { useEffect, useMemo, useState } from 'react'
import { Crown, Medal, PartyPopper, Trophy } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtime } from '@/hooks/use-realtime'
import { usersService } from '@/services/users'
import {
  buscarConcluidasDoMes,
  ehUltimoDiaDoMes,
  listaMeses,
  mesAtualYM,
  montarPodio,
  rotuloMes,
  type PremiacaoRow,
} from '@/services/premiacao'
import type { AtribuicaoRecord } from '@/types'

/** Estilo visual de cada degrau do pódio (ouro, prata, bronze) */
const DEGRAUS = [
  {
    // 1º lugar — ouro
    medalha: 'text-[#B77A0A]',
    fundo: 'bg-gradient-to-b from-[#FFF4CC] to-[#F5B841]/40',
    borda: 'border-[#F5B841]',
    altura: 'h-40',
    cor: 'bg-[#F5B841] text-[#3B2B2B]',
    label: '1º lugar',
  },
  {
    // 2º lugar — prata
    medalha: 'text-[#7A7F87]',
    fundo: 'bg-gradient-to-b from-[#F4F6F8] to-[#C9CED6]/50',
    borda: 'border-[#C9CED6]',
    altura: 'h-32',
    cor: 'bg-[#C9CED6] text-[#3B2B2B]',
    label: '2º lugar',
  },
  {
    // 3º lugar — bronze
    medalha: 'text-[#A0622D]',
    fundo: 'bg-gradient-to-b from-[#FBEBDD] to-[#D9925B]/40',
    borda: 'border-[#D9925B]',
    altura: 'h-24',
    cor: 'bg-[#D9925B] text-white',
    label: '3º lugar',
  },
]

function Degrau({ row, idx }: { row: PremiacaoRow; idx: number }) {
  const d = DEGRAUS[idx]
  const avatarUrl = row.colab ? usersService.getFileUrl(row.colab, row.avatar) : ''
  return (
    <div className="flex flex-col items-center justify-end min-w-0 flex-1">
      <Avatar className={`w-14 h-14 border-2 ${d.borda} shadow-sm mb-2`}>
        <AvatarImage src={avatarUrl} alt={row.nome} />
        <AvatarFallback className="bg-[#FFF9F2] text-[#3B2B2B] font-bold text-sm">
          {row.nome.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <Medal className={`w-6 h-6 mb-1 ${d.medalha}`} />
      <p className="text-sm font-bold text-[#3B2B2B] text-center truncate max-w-full px-1">
        {row.nome}
      </p>
      <p className="text-[11px] text-[#8A6F6F] mb-2">
        {row.concluidas} {row.concluidas === 1 ? 'tarefa' : 'tarefas'}
      </p>
      <div
        className={`w-full ${d.altura} ${d.fundo} border-t-4 ${d.borda} rounded-t-2xl flex items-start justify-center pt-2`}
      >
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${d.cor}`}>
          {d.label}
        </span>
      </div>
    </div>
  )
}

export function PremiacaoMes() {
  const [mes, setMes] = useState(() => mesAtualYM())
  const [atribs, setAtribs] = useState<AtribuicaoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [versao, setVersao] = useState(0)

  const meses = useMemo(() => listaMeses(24), [])
  const ehMesAtual = mes === mesAtualYM()
  // Destaque de anúncio: só no mês corrente, no último dia do mês (detectado automaticamente)
  const anuncioFimDoMes = ehMesAtual && ehUltimoDiaDoMes()

  // Atualiza o pódio do mês corrente quando uma tarefa muda
  useRealtime<AtribuicaoRecord>('atribuicoes', () => setVersao((v) => v + 1), ehMesAtual)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setErro(false)
    buscarConcluidasDoMes(mes)
      .then((r) => {
        if (!cancelado) setAtribs(r)
      })
      .catch(() => {
        if (!cancelado) {
          setAtribs([])
          setErro(true)
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [mes, versao])

  const ranking = useMemo(() => montarPodio(atribs), [atribs])
  const top3 = ranking.slice(0, 3)
  // Ordem visual do pódio: 2º à esquerda, 1º no centro, 3º à direita
  const ordemPodio = [top3[1], top3[0], top3[2]]
  const indicesPodio = [1, 0, 2]

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#2D7A51]/20 shadow-xs mb-6">
      {anuncioFimDoMes && top3.length > 0 && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#2D7A51] to-[#3FA372] text-white p-5 flex items-center gap-4 shadow-md">
          <PartyPopper className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">
              Fim do mês — anúncio oficial
            </p>
            <p className="text-xl font-display font-extrabold leading-tight">
              Vencedores de {rotuloMes(mes)}!
            </p>
            <p className="text-sm opacity-95 truncate">
              🥇 {top3[0].nome}
              {top3[1] && <> · 🥈 {top3[1].nome}</>}
              {top3[2] && <> · 🥉 {top3[2].nome}</>}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#2D7A51]" />
          <h2 className="text-lg font-display font-bold text-[#3B2B2B]">Premiação do Mês</h2>
        </div>
        <div className="w-44">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="h-9 rounded-xl bg-[#FFF9F2]/50 border-[#2D7A51]/30 text-xs font-semibold">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {rotuloMes(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-[#8A6F6F] mb-5">
        Os três colaboradores com mais tarefas <strong>concluídas</strong> em {rotuloMes(mes)}.
        Tarefas “não aplicável” não contam. Empates são desempatados por quem atingiu a quantidade
        primeiro (horário da última conclusão mais cedo).
      </p>

      {loading ? (
        <p className="text-xs text-[#8A6F6F] py-8 text-center">Carregando premiação…</p>
      ) : erro ? (
        <p className="text-xs text-[#E5484D] py-8 text-center font-semibold">
          Não foi possível carregar a premiação deste mês.
        </p>
      ) : top3.length === 0 ? (
        <p className="text-xs text-[#8A6F6F] py-8 text-center">
          Nenhuma tarefa concluída em {rotuloMes(mes)}.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 items-end max-w-2xl mx-auto">
          {ordemPodio.map((row, col) =>
            row ? (
              <Degrau key={row.colaboradorId} row={row} idx={indicesPodio[col]} />
            ) : (
              <div key={`vazio-${col}`} className="flex-1" />
            ),
          )}
        </div>
      )}

      {!loading && !erro && ranking.length > 3 && (
        <div className="mt-5 space-y-1.5">
          <p className="text-[11px] font-semibold text-[#8A6F6F] uppercase tracking-wide">
            Demais colaboradores
          </p>
          {ranking.slice(3, 8).map((r, i) => (
            <div
              key={r.colaboradorId}
              className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[#FFF9F2]/60 border border-[#F2A65A]/15"
            >
              <span className="font-semibold text-[#3B2B2B] truncate">
                {i + 4}º {r.nome}
              </span>
              <span className="text-[#8A6F6F] shrink-0 ml-2">{r.concluidas} concluídas</span>
            </div>
          ))}
        </div>
      )}

      {!loading && !erro && top3.length > 0 && !anuncioFimDoMes && ehMesAtual && (
        <p className="mt-4 text-[11px] text-[#8A6F6F] flex items-center gap-1">
          <Crown className="w-3 h-3" /> O anúncio oficial aparece no último dia do mês.
        </p>
      )}
    </div>
  )
}

export default PremiacaoMes
