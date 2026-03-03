'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, AtSign, Globe, Calendar, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const PAISES = ['Brasil', 'Estados Unidos', 'Portugal', 'Argentina', 'Chile', 'México', 'Outro']

function forcaSenha(senha: string): { nivel: number; label: string; cor: string } {
  let pts = 0
  if (senha.length >= 8)                pts++
  if (/[A-Z]/.test(senha))             pts++
  if (/[0-9]/.test(senha))             pts++
  if (/[^A-Za-z0-9]/.test(senha))      pts++

  if (pts <= 1) return { nivel: 1, label: 'Fraca',  cor: 'bg-red-500'    }
  if (pts === 2) return { nivel: 2, label: 'Média',  cor: 'bg-yellow-500' }
  if (pts === 3) return { nivel: 3, label: 'Boa',    cor: 'bg-blue-500'   }
  return               { nivel: 4, label: 'Forte', cor: 'bg-brand-green'  }
}

export default function CadastroPage() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [form, setForm] = useState({
    nome:     '',
    username: '',
    email:    '',
    senha:    '',
    idade:    '',
    pais:     'Brasil',
    bio:      '',
  })
  const [verSenha,    setVerSenha]    = useState(false)
  const [carregando,  setCarregando]  = useState(false)
  const [etapa,       setEtapa]       = useState(1) // 1 = dados, 2 = perfil

  const atualizar = (campo: string, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    const { nome, username, email, senha, idade, pais } = form

    if (!nome || !username || !email || !senha || !idade) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    if (senha.length < 8) {
      toast.error('Senha deve ter pelo menos 8 caracteres')
      return
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      toast.error('@username só pode conter letras minúsculas, números e _')
      return
    }

    setCarregando(true)
    const { error } = await signUp(email, senha, {
      nome,
      username: username.toLowerCase(),
      idade:    Number(idade),
      pais,
      bio:      form.bio,
    })
    setCarregando(false)

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado')
      } else {
        toast.error('Erro ao criar conta. Tente novamente.')
      }
    } else {
      toast.success('Conta criada! Seja bem-vindo ao Investagram 🚀')
      router.push('/main/feed')
    }
  }

  const forca = forcaSenha(form.senha)

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-green/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-brand-dark" />
            </div>
            <span className="text-2xl font-bold text-white">Investagram</span>
          </div>
          <p className="text-brand-muted text-sm">Crie sua conta e comece a investir socialmente</p>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-white mb-6">Criar conta grátis</h1>

          <form onSubmit={handleCadastro} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm text-brand-muted mb-1">Nome completo *</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => atualizar('nome', e.target.value)}
                  placeholder="João Silva"
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-brand-muted mb-1">@username *</label>
              <div className="relative">
                <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => atualizar('username', e.target.value.toLowerCase())}
                  placeholder="joaosilva"
                  className="input pl-9"
                  maxLength={30}
                />
              </div>
              <p className="text-xs text-brand-muted mt-1">Apenas letras minúsculas, números e _</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-brand-muted mb-1">Email *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => atualizar('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm text-brand-muted mb-1">Senha *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type={verSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={(e) => atualizar('senha', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(!verSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
                >
                  {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Barra de força */}
              {form.senha.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          n <= forca.nivel ? forca.cor : 'bg-brand-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-brand-muted mt-1">Força: {forca.label}</p>
                </div>
              )}
            </div>

            {/* Idade e País lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-brand-muted mb-1">Idade *</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    type="number"
                    value={form.idade}
                    onChange={(e) => atualizar('idade', e.target.value)}
                    placeholder="25"
                    min={16}
                    max={99}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-1">País *</label>
                <div className="relative">
                  <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <select
                    value={form.pais}
                    onChange={(e) => atualizar('pais', e.target.value)}
                    className="input pl-9 appearance-none"
                  >
                    {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Bio (opcional) */}
            <div>
              <label className="block text-sm text-brand-muted mb-1">
                Bio <span className="text-xs">(opcional)</span>
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => atualizar('bio', e.target.value)}
                placeholder="Investidor em valor, foco em dividendos e cripto..."
                maxLength={160}
                rows={2}
                className="input resize-none"
              />
              <p className="text-xs text-brand-muted mt-1 text-right">{form.bio.length}/160</p>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="btn-primary w-full mt-2"
            >
              {carregando ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : 'Criar conta grátis'}
            </button>
          </form>

          <p className="text-center text-brand-muted text-sm mt-6">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-brand-green font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
