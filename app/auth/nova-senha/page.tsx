'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function forca(senha: string) {
  let score = 0
  if (senha.length >= 8)           score++
  if (/[A-Z]/.test(senha))        score++
  if (/[0-9]/.test(senha))        score++
  if (/[^A-Za-z0-9]/.test(senha)) score++
  return score
}

const FORCA_CONFIG = [
  { label: 'Muito fraca', cor: 'bg-red-500'    },
  { label: 'Fraca',       cor: 'bg-orange-400' },
  { label: 'Média',       cor: 'bg-yellow-400' },
  { label: 'Forte',       cor: 'bg-blue-400'   },
  { label: 'Muito forte', cor: 'bg-brand-green' },
]

export default function NovaSenhaPage() {
  const router = useRouter()

  const [novaSenha,     setNovaSenha]     = useState('')
  const [confirmar,     setConfirmar]     = useState('')
  const [showNova,      setShowNova]      = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [salvando,      setSalvando]      = useState(false)
  const [salvo,         setSalvo]         = useState(false)
  const [sessaoOk,      setSessaoOk]      = useState(false)
  const [erro,          setErro]          = useState('')

  const forcaScore   = forca(novaSenha)
  const forcaConfig  = FORCA_CONFIG[forcaScore] ?? FORCA_CONFIG[0]
  const senhasIguais = novaSenha === confirmar && confirmar.length > 0

  // Supabase redireciona com tokens na URL — precisa processar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoOk(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessaoOk(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSalvar = async () => {
    if (novaSenha.length < 8) { setErro('Mínimo 8 caracteres'); return }
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem'); return }
    if (forcaScore < 2) { setErro('Escolha uma senha mais forte'); return }

    setErro('')
    setSalvando(true)

    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    setSalvando(false)

    if (error) {
      setErro('Erro ao salvar senha. O link pode ter expirado.')
    } else {
      setSalvo(true)
      setTimeout(() => router.push('/main/feed'), 3000)
    }
  }

  if (salvo) {
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
          <h2 className="text-xl font-bold text-white mb-2">Senha alterada!</h2>
          <p className="text-brand-muted text-sm">Redirecionando para o feed...</p>
        </motion.div>
      </div>
    )
  }

  if (!sessaoOk) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-lg font-bold text-white mb-2">Link inválido ou expirado</h2>
          <p className="text-brand-muted text-sm mb-6">
            Este link de recuperação não é válido ou já expirou. Solicite um novo.
          </p>
          <Link href="/auth/recuperar" className="btn-primary inline-flex">
            Solicitar novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-green flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-brand-dark" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nova senha</h1>
          <p className="text-brand-muted text-sm mt-1">Escolha uma senha segura</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 space-y-4"
        >
          {/* Nova senha */}
          <div>
            <label className="block text-sm text-brand-muted mb-2">Nova senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type={showNova ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => { setNovaSenha(e.target.value); setErro('') }}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                className="input pl-9 pr-10"
              />
              <button type="button" onClick={() => setShowNova(!showNova)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white">
                {showNova ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {novaSenha.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      i < forcaScore ? forcaConfig.cor : 'bg-brand-surface'
                    }`} />
                  ))}
                </div>
                <p className="text-xs text-brand-muted">{forcaConfig.label}</p>
              </div>
            )}
          </div>

          {/* Confirmar */}
          <div>
            <label className="block text-sm text-brand-muted mb-2">Confirmar nova senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type={showConfirmar ? 'text' : 'password'}
                value={confirmar}
                onChange={(e) => { setConfirmar(e.target.value); setErro('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
                placeholder="Repita a nova senha"
                className={`input pl-9 pr-10 ${
                  confirmar.length > 0 ? senhasIguais ? 'border-brand-green' : 'border-red-400' : ''
                }`}
              />
              <button type="button" onClick={() => setShowConfirmar(!showConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white">
                {showConfirmar ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {senhasIguais && (
              <p className="text-xs text-brand-green mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> Senhas coincidem
              </p>
            )}
          </div>

          {erro && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erro}</p>}

          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {salvando
              ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
              : <><Lock size={15} /> Salvar nova senha</>
            }
          </button>
        </motion.div>
      </div>
    </div>
  )
}
