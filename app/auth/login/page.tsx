'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()

  const [email,     setEmail]     = useState('')
  const [senha,     setSenha]     = useState('')
  const [verSenha,  setVerSenha]  = useState(false)
  const [carregando, setCarregando] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) { toast.error('Preencha todos os campos'); return }

    setCarregando(true)
    const { error } = await signIn(email, senha)
    setCarregando(false)

    if (error) {
      toast.error('Email ou senha incorretos')
    } else {
      toast.success('Bem-vindo de volta! 📈')
      router.push('/main/feed')
    }
  }

  const handleRecuperarSenha = async () => {
    if (!email) { toast.error('Digite seu email primeiro'); return }
    // Versão 1: Notificação manual ao admin
    await fetch('/api/recuperar-senha', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
    })
    toast.success('Solicitação enviada! Você receberá instruções em breve.')
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-green/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-brand-dark" />
            </div>
            <span className="text-3xl font-bold text-white">Investagram</span>
          </div>
          <p className="text-brand-muted">A rede social dos investidores</p>
        </div>

        {/* Card de login */}
        <div className="card p-8">
          <h1 className="text-xl font-bold text-white mb-6">Entrar na sua conta</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-brand-muted mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm text-brand-muted mb-2">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type={verSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  className="input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(!verSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
                >
                  {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Esqueci a senha */}
            <div className="text-right">
              <Link
                href="/auth/recuperar"
                className="text-sm text-brand-green hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="btn-primary w-full mt-2"
            >
              {carregando ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Link para cadastro */}
          <p className="text-center text-brand-muted text-sm mt-6">
            Não tem conta?{' '}
            <Link href="/auth/cadastro" className="text-brand-green font-medium hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
