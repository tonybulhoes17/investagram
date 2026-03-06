'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

export function InstallPWA() {
  const [prompt,    setPrompt]    = useState<any>(null)
  const [mostrar,   setMostrar]   = useState(false)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => {
    // Verifica se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalado(true)
      return
    }

    // Verifica se o usuário já dispensou antes
    const dispensou = localStorage.getItem('pwa-banner-dispensado')
    if (dispensou) return

    // Captura o evento de instalação do browser
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
    if (outcome === 'accepted') {
      setMostrar(false)
      setInstalado(true)
    }
  }

  const handleDispensar = () => {
    setMostrar(false)
    localStorage.setItem('pwa-banner-dispensado', '1')
  }

  if (instalado || !mostrar) return null

  return (
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
            {/* Ícone do app */}
            <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shrink-0">
              <Download size={18} className="text-brand-dark" />
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">Instale o Investagram!</p>
              <p className="text-[10px] text-brand-muted">Acesso rápido + notificações</p>
            </div>

            {/* Botão instalar */}
            <button
              onClick={handleInstalar}
              className="bg-brand-green text-brand-dark text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 hover:opacity-90 transition-opacity"
            >
              Instalar
            </button>

            {/* Fechar */}
            <button
              onClick={handleDispensar}
              className="p-1 text-brand-muted hover:text-white transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
