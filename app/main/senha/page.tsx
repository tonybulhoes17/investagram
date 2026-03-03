'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

function forca(senha: string) {
  let score = 0
  if (senha.length >= 8)              score++
  if (/[A-Z]/.test(senha))           score++
  if (/[0-9]/.test(senha))           score++
  if (/[^A-Za-z0-9]/.test(senha))    score++
  return score
}

const FORCA_CONFIG = [
  { label: 'Muito fraca', cor: 'bg-red-500'    },
  { label: 'Fraca',       cor: 'bg-orange-400' },
  { label: 'Média',       cor: 'bg-yellow-400' },
  { label: 'Forte',       cor: 'bg-blue-400'   },
  { label: 'Muito forte', cor: 'bg-brand-green' },
]

export default function TrocarSenhaPage() {
  const router   = useRouter()
  const { user } = useAuth()

  const [senhaAtual,    setSenhaAtual]    = useState('')
  const [novaSenha,     setNovaSenha]     = useState('')
  const [confirmar,     setConfirmar]     = useState('')
  const [showAtual,     setShowAtual]     = useState(false)
  const [showNova,      setShowNova]      = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [salvando,      setSalvando]      = useState(false)

  const forcaScore  = forca(novaSenha)
  const forcaConfig = FORCA_CONFIG[forcaScore] ?? FORCA_CONFIG[0]
  const senhasIguais = novaSenha === confirmar && confirmar.length > 0

  const handleTrocar = async () => {
    if (!user) return

    if (!senhaAtual.trim()) {
      toast.error('Informe sua senha atual')
      return
    }
    if (novaSenha.length < 8) {
      toast.error('Nova senha deve ter pelo menos 8 caracteres')
      return
    }
    if (novaSenha !== confirmar) {
      toast.error('As senhas não coincidem')
      return
    }
    if (forcaScore < 2) {
      toast.error('Escolha uma senha mais forte')
      return
    }

    setSalvando(true)

    // Verifica senha atual fazendo re-autenticação
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email:    user.email!,
      password: senhaAtual,
    })

    if (loginError) {
      toast.error('Senha atual incorreta')
      setSalvando(false)
      return
    }

    // Atualiza para a nova senha
    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    setSalvando(false)

    if (error) {
      toast.error('Erro ao trocar senha. Tente novamente.')
    } else {
      toast.success('Senha alterada com sucesso! 🔒')
      router.back()
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-brand-muted hover:text-white transition-colors rounded-xl hover:bg-brand-surface"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Trocar senha</h1>
          <p className="text-xs text-brand-muted">{user?.email}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 space-y-5"
      >
        {/* Senha atual */}
        <div>
          <label className="block text-sm text-brand-muted mb-2">Senha atual</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type={showAtual ? 'text' : 'password'}
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="••••••••"
              className="input pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowAtual(!showAtual)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              {showAtual ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="border-t border-brand-border" />

        {/* Nova senha */}
        <div>
          <label className="block text-sm text-brand-muted mb-2">Nova senha</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type={showNova ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="input pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNova(!showNova)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              {showNova ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Barra de força */}
          {novaSenha.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[0,1,2,3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i < forcaScore ? forcaConfig.cor : 'bg-brand-surface'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-brand-muted">{forcaConfig.label}</p>
            </div>
          )}
        </div>

        {/* Confirmar nova senha */}
        <div>
          <label className="block text-sm text-brand-muted mb-2">Confirmar nova senha</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type={showConfirmar ? 'text' : 'password'}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              className={`input pl-9 pr-10 ${
                confirmar.length > 0
                  ? senhasIguais
                    ? 'border-brand-green'
                    : 'border-red-400'
                  : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmar(!showConfirmar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              {showConfirmar ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmar.length > 0 && !senhasIguais && (
            <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
          )}
          {senhasIguais && (
            <p className="text-xs text-brand-green mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> Senhas coincidem
            </p>
          )}
        </div>

        <button
          onClick={handleTrocar}
          disabled={salvando}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {salvando ? (
            <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Lock size={15} /> Trocar senha</>
          )}
        </button>
      </motion.div>
    </div>
  )
}
