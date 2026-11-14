import { useEffect, useState } from 'react'
import { Share2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isStandalone, onInstallAvailable, promptInstall } from '@/lib/pwa'

/**
 * Botão "Instalar aplicativo" exibido na tela de login.
 * - Chrome/Edge/Android: usa o evento nativo `beforeinstallprompt`.
 * - iOS Safari (sem suporte ao evento): mostra o passo a passo de
 *   "Compartilhar → Adicionar à Tela de Início".
 * - App já instalado (standalone) ou sem suporte: botão oculto.
 */
export const InstallAppButton: React.FC = () => {
  const [canPrompt, setCanPrompt] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  const isIos =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  useEffect(() => {
    if (isStandalone()) return

    const unsubscribe = onInstallAvailable((available) => {
      if (available) {
        setCanPrompt(true)
        setShowIosHelp(false)
      } else if (isIos) {
        // No iOS o evento nunca dispara, mas a instalação manual funciona.
        setCanPrompt(false)
        setShowIosHelp(true)
      }
    })

    // iOS: se após 1s nada aconteceu, oferecemos as instruções manuais.
    const t = setTimeout(() => {
      if (!canPrompt && isIos && !isStandalone()) setShowIosHelp(true)
    }, 1000)

    return () => {
      unsubscribe()
      clearTimeout(t)
    }
  }, [isIos])

  if (isStandalone()) return null

  if (canPrompt) {
    return (
      <Button
        type="button"
        onClick={async () => {
          const shown = await promptInstall()
          if (!shown && isIos) setShowIosHelp(true)
        }}
        className="w-full h-11 rounded-full bg-[#3B2B2B] hover:bg-[#2A1F1F] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
      >
        <Smartphone className="w-4 h-4 mr-2" />
        Instalar aplicativo
      </Button>
    )
  }

  if (showIosHelp) {
    return (
      <div className="w-full rounded-xl bg-[#FFF3E8] border border-[#F2A65A]/30 p-3.5 text-left">
        <p className="text-xs font-bold text-[#3B2B2B] flex items-center gap-1.5 mb-1.5">
          <Smartphone className="w-3.5 h-3.5 text-[#E0447C]" />
          Instalar no iPhone/iPad
        </p>
        <p className="text-[11px] text-[#8A6F6F] leading-relaxed flex items-center gap-1 flex-wrap">
          Toque no ícone <Share2 className="inline w-3 h-3 text-[#E0447C]" />{' '}
          <strong>Compartilhar</strong> da barra do Safari e escolha{' '}
          <strong className="text-[#E0447C]">Adicionar à Tela de Início</strong>.
        </p>
      </div>
    )
  }

  return null
}
