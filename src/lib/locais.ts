// Locais de operação do Tati Check (Fábrica, Barão, Uruguai, Meier)
export const LOCAIS = ['fabrica', 'barao', 'uruguai', 'meier'] as const

export type LocalValue = (typeof LOCAIS)[number]

export const LOCAL_LABELS: Record<LocalValue, string> = {
  fabrica: 'Fábrica',
  barao: 'Barão',
  uruguai: 'Uruguai',
  meier: 'Meier',
}

// Cores de destaque por local (bordas/fundos suaves, paleta do app)
export const LOCAL_COLORS: Record<LocalValue, { bg: string; text: string; border: string }> = {
  fabrica: { bg: 'bg-[#E0447C]/10', text: 'text-[#C23066]', border: 'border-[#E0447C]/25' },
  barao: { bg: 'bg-[#F2A65A]/15', text: 'text-[#C96B16]', border: 'border-[#F2A65A]/35' },
  uruguai: { bg: 'bg-[#2D7A51]/10', text: 'text-[#2D7A51]', border: 'border-[#2D7A51]/25' },
  meier: { bg: 'bg-[#6366F1]/10', text: 'text-[#4F46E5]', border: 'border-[#6366F1]/25' },
}

export function localLabel(local?: string | null): string {
  if (!local) return ''
  return LOCAL_LABELS[local as LocalValue] ?? local
}

export function isLocalValue(v?: string | null): v is LocalValue {
  return !!v && (LOCAIS as readonly string[]).includes(v)
}
