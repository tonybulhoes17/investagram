'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RecuperarSenhaPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado,  setEnviado]  = useState(false)
  const [erro,     setErro]     = useState('')

  const handleEnviar = async () => {
    if (!email.trim()) { setErro('Informe seu email'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro('Email inválido')
      return
    }

    setErro('')
    setEnviando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/nova-senha`,
    })

    setEnviando(false)

    if (error) {
      setErro('Erro ao enviar email. Tente novamente.')
    } else {
      setEnviado(true)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-brand-green/10 border border-brand-green/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-brand-green" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Email enviado!</h2>
          <p className="text-brand-muted text-sm mb-2">
            Enviamos um link de recuperação para:
          </p>
          <p className="text-white font-semibold mb-4">{email}</p>
          <p className="text-brand-muted text-xs mb-6 leading-relaxed">
            Verifique sua caixa de entrada e spam. O link expira em 1 hora.
          </p>
          <Link href="/auth/login" className="btn-primary w-full flex items-center justify-center gap-2">
            Voltar para o login
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-green flex items-center justify-center mx-auto mb-3">
            <span className="text-brand-dark font-bold text-xl">📈</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
          <p className="text-brand-muted text-sm mt-1">
            Digite seu email para receber o link de recuperação
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-brand-muted mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErro('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
                placeholder="seu@email.com"
                autoFocus
                className={`input pl-9 ${erro ? 'border-red-400' : ''}`}
              />
            </div>
            {erro && <p className="text-xs text-red-400 mt-1">{erro}</p>}
          </div>

          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {enviando ? (
              <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Send size={15} /> Enviar link de recuperação</>
            )}
          </button>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-1.5 text-sm text-brand-muted hover:text-white transition-colors"
            >
              <ArrowLeft size={13} />
              Voltar para o login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
