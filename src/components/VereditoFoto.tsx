import { CircleCheckBig, Bot, AlertTriangle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FotoVeredito } from '@/types'

export const vereditoLabel: Record<string, string> = {
  aprovado: 'IA aprovou',
  duvidoso: 'IA duvidosa',
  reprovado: 'IA reprovou',
  erro: 'Conferência indisponível',
}

export const vereditoEstilo: Record<string, string> = {
  aprovado: 'text-[#2D7A51] bg-[#EDF8F1] border-[#2D7A51]/25',
  duvidoso: 'text-[#B77A0A] bg-[#FFFBEB] border-[#B77A0A]/25',
  reprovado: 'text-[#E5484D] bg-[#FFF5F5] border-[#E5484D]/25',
  erro: 'text-[#8A6F6F] bg-stone-100 border-stone-300/40',
}

export const vereditoIcone: Record<string, typeof Bot> = {
  aprovado: CircleCheckBig,
  duvidoso: HelpCircle,
  reprovado: Bot,
  erro: AlertTriangle,
}

/** Badge compacto do veredito da conferência IA (para listas). */
export function VereditoBadge({
  veredito,
  className,
}: {
  veredito: FotoVeredito | '' | undefined
  className?: string
}) {
  if (!veredito) return null
  const Icone = vereditoIcone[veredito] || Bot
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
        vereditoEstilo[veredito] || vereditoEstilo.erro,
        className,
      )}
      title={`Conferência automática da foto: ${vereditoLabel[veredito] || veredito}`}
    >
      <Icone className="w-2.5 h-2.5" />
      {vereditoLabel[veredito] || veredito}
    </span>
  )
}

/** Bloco comentado do veredito (para detalhes/drawer). */
export function VereditoDetalhe({
  veredito,
  comentario,
}: {
  veredito: FotoVeredito | '' | undefined
  comentario?: string
}) {
  if (!veredito) return null
  const Icone = vereditoIcone[veredito] || Bot
  return (
    <div
      className={cn(
        'p-3 rounded-xl border space-y-1',
        vereditoEstilo[veredito] || vereditoEstilo.erro,
      )}
    >
      <p className="text-xs font-bold flex items-center gap-1.5">
        <Icone className="w-3.5 h-3.5" /> Conferência automática da foto ·{' '}
        {vereditoLabel[veredito] || veredito}
      </p>
      {comentario && <p className="text-[11px] leading-relaxed">{comentario}</p>}
    </div>
  )
}
