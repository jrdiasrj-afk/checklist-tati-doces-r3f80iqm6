/**
 * Registro do Service Worker + captura do evento `beforeinstallprompt`.
 * iOS Safari não dispara o evento — nesses casos mostramos instruções
 * de "Adicionar à Tela de Início" (compartilhar → Adicionar).
 */
let deferredPrompt: any = null

type Listener = (available: boolean) => void
const listeners = new Set<Listener>()

const notify = () => listeners.forEach((l) => l(true))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })

  // Quando o app já está instalado (modo standalone), não oferecemos instalar.
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((l) => l(false))
  })

  if (!isStandalone) {
    // Verificação assíncrona do SW (não bloqueia a renderização).
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          /* silencioso: SW é progressivo, nunca quebra o app */
        })
      })
    }
  }
}

/** Registra um listener que é avisado quando a instalação fica disponível/indisponível. */
export function onInstallAvailable(cb: Listener) {
  if (deferredPrompt) cb(true)
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Tenta abrir o prompt nativo de instalação.
 * Retorna true se o prompt foi mostrado; false se não há suporte
 * (ex.: iOS Safari — nesse caso a UI mostra o passo a passo manual).
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice.catch(() => null)
  deferredPrompt = null
  if (choice && choice.outcome !== 'accepted') {
    listeners.forEach((l) => l(false))
  }
  return true
}

/** true se o app já está rodando instalado (standalone). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}
