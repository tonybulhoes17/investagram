'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share } from 'lucide-react'

export function InstallPWA() {
  const [prompt,       setPrompt]       = useState<any>(null)
  const [mostrar,      setMostrar]      = useState(false)
  const [mostrarIOS,   setMostrarIOS]   = useState(false)

  useEffect(() => {
    // Já está instalado como PWA — não mostra nada
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Verifica se é iPhone/iPad com Safari
    const isIOS     = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari  = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    if (isIOS && isSafari) {
      const dispensou = localStorage.getItem('pwa-ios-dispensado')
      if (!dispensou) {
        // Mostra após 3 segundos
        setTimeout(() => setMostrarIOS(true), 3000)
      }
      return
    }

    // Android/Chrome — banner de instalação nativo
    const dispensou = localStorage.getItem('pwa-banner-dispensado')
    if (dispensou) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setMostrar(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstalar = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setMostrar(false)
  }

  const handleDispensarAndroid = () => {
    setMostrar(false)
    localStorage.setItem('pwa-banner-dispensado', '1')
  }

  const handleDispensarIOS = () => {
    setMostrarIOS(false)
    localStorage.setItem('pwa-ios-dispensado', '1')
  }

  return (
    <>
      {/* ── BANNER ANDROID ─────────────────────────────────── */}
      <AnimatePresence>
        {mostrar && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0,   opacity: 1 }}
            exit={{   y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="md:hidden fixed top-12 left-3 right-3 z-[99]"
          >
            <div className="flex items-center gap-3 bg-brand-dark border border-brand-green/40 rounded-2xl px-4 py-3 shadow-2xl"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shrink-0">
                <Download size={18} className="text-brand-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Instale o Investagram!</p>
                <p className="text-[10px] text-brand-muted">Acesso rápido + notificações</p>
              </div>
              <button onClick={handleInstalar}
                className="bg-brand-green text-brand-dark text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 hover:opacity-90 transition-opacity"
              >
                Instalar
              </button>
              <button onClick={handleDispensarAndroid}
                className="p-1 text-brand-muted hover:text-white transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BANNER iOS ─────────────────────────────────────── */}
      <AnimatePresence>
        {mostrarIOS && (
          <>
            {/* Overlay escuro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              className="fixed inset-0 z-[98] bg-black/60"
              onClick={handleDispensarIOS}
            />

            {/* Card de instrução — aparece na parte de baixo */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0,   opacity: 1 }}
              exit={{   y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[99] bg-brand-card border-t border-brand-border rounded-t-3xl p-6 pb-10"
            >
              {/* Botão fechar */}
              <button onClick={handleDispensarIOS}
                className="absolute top-4 right-4 p-2 text-brand-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              {/* Ícone + título */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-brand-green flex items-center justify-center shrink-0">
                  <Download size={22} className="text-brand-dark" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">Instale o Investagram</p>
                  <p className="text-xs text-brand-muted">Acesso rápido + notificações</p>
                </div>
              </div>

              {/* Passos */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-brand-green">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">Toque no botão <strong>Compartilhar</strong></p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="bg-brand-surface rounded-lg p-1.5">
                        <Share size={14} className="text-brand-green" />
                      </div>
                      <span className="text-xs text-brand-muted">Ícone na barra do Safari</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-brand-green">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Role para baixo e toque em</p>
                    <p className="text-sm font-bold text-brand-green mt-0.5">"Adicionar à Tela de Início"</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-brand-green">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Toque em <strong>"Adicionar"</strong> no canto superior direito</p>
                  </div>
                </div>
              </div>

              {/* Seta apontando para baixo (onde fica o Safari share) */}
              <div className="flex justify-center mt-5">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-1 h-8 bg-brand-green/40 rounded-full" />
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-brand-green/40" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
