import React from 'react'
import { AreaProcesso } from '@/types'

interface AreaBadgeProps {
  area: AreaProcesso | string
  size?: 'sm' | 'md'
}

const areaConfig: Record<string, { bg: string; text: string; border: string }> = {
  Cozinha: { bg: 'bg-[#FFF3E8]', text: 'text-[#C96B16]', border: 'border-[#F2A65A]/40' },
  Loja: { bg: 'bg-[#FDF0F5]', text: 'text-[#C23066]', border: 'border-[#E0447C]/40' },
  Caixa: { bg: 'bg-[#EDF5F9]', text: 'text-[#446A80]', border: 'border-[#7C9EB2]/40' },
  Limpeza: { bg: 'bg-[#EDF8F1]', text: 'text-[#2D7A51]', border: 'border-[#7FBF8E]/40' },
  Estoque: { bg: 'bg-[#F4EFFB]', text: 'text-[#6C4E97]', border: 'border-[#B39BD0]/40' },
}

export const AreaBadge: React.FC<AreaBadgeProps> = ({ area, size = 'sm' }) => {
  const config = areaConfig[area] || {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
  }
  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {area}
    </span>
  )
}
