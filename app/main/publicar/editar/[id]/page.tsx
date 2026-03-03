'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, TrendingUp, TrendingDown, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ASSET_CLASSE_LABELS, AssetClasse } from '@/types'
import toast from 'react-hot-toast'

type TipoPost = 'movimentacao' | 'tese'
type Subtipo  = 'compra' | 'venda'

const CLASSES = Object.entries(ASSET_CLASSE_LABELS) as [AssetClasse, string][]

export default function EditarPostPage() {
  const params              = useParams()
  const postId              = params.id as string
  const router              = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [tipo,        setTipo]        = useState<TipoPost>('movimentacao')
  const [subtipo,     setSubtipo]     = useState<Subtipo>('compra')
  const [ativoNome,   setAtivoNome]   = useState('')
  const [ativoClasse, setAtivoClasse] = useState<AssetClasse>('acao_br')
  const [dataOp,      setDataOp]      = useState('')
  const [conteudo,    setConteudo]    = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [carregando,  setCarregando]  = useState(true)
  const [carregouPost, setCarregouPost] = useState(false)

  // Espera o auth terminar de carregar antes de buscar o post
  useEffect(() => {
    if (authLoading) return          // ainda verificando sessão, aguarda
    if (!user) {                     // auth resolveu: sem usuário → login
      router.replace('/auth/login')
      return
    }
    if (!carregouPost) carregarPost()
  }, [authLoading, user])

  const carregarPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error || !data) {
      toast.error('Post não encontrado')
      router.back()
      return
    }

    // Confere dono DEPOIS do auth ter carregado
    if (data.user_id !== user!.id) {
      toast.error('Você não pode editar este post')
      router.back()
      return
    }

    setTipo(data.tipo)
    setSubtipo(data.subtipo ?? 'compra')
    setAtivoNome(data.ativo_nome ?? '')
    setAtivoClasse((data.ativo_classe as AssetClasse) ?? 'acao_br')
    setDataOp(data.data_operacao ?? new Date().toISOString().split('T')[0])
    setConteudo(data.conteudo ?? '')
    setCarregouPost(true)
    setCarregando(false)
  }

  const handleSalvar = async () => {
    if (!user) return

    if (tipo === 'movimentacao' && !ativoNome.trim()) {
      toast.error('Informe o nome do ativo')
      return
    }
    if (tipo === 'tese' && !conteudo.trim()) {
      toast.error('Escreva o conteúdo da tese')
      return
    }

    setSalvando(true)

    const { error } = await supabase
      .from('posts')
      .update({
        tipo,
        subtipo:       tipo === 'movimentacao' ? subtipo : null,
        ativo_nome:    ativoNome.trim() || null,
        ativo_classe:  tipo === 'movimentacao' ? ativoClasse : null,
        conteudo:      conteudo.trim() || null,
        data_operacao: tipo === 'movimentacao' ? dataOp : null,
      })
      .eq('id', postId)
      .eq('user_id', user.id)

    setSalvando(false)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
    } else {
      toast.success('Post atualizado! ✅')
      router.back()
    }
  }

  // Skeleton enquanto auth ou post carregam
  if (authLoading || carregando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-10 animate-pulse">
          <div className="h-4 bg-brand-surface rounded w-40 mb-6" />
          <div className="h-10 bg-brand-surface rounded mb-3" />
          <div className="h-10 bg-brand-surface rounded mb-3" />
          <div className="h-24 bg-brand-surface rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-brand-muted hover:text-white transition-colors rounded-xl hover:bg-brand-surface"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Editar post</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Tipo do post */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTipo('movimentacao')}
            className={`card p-4 text-center transition-all ${
              tipo === 'movimentacao'
                ? 'border-brand-green bg-brand-green/5'
                : 'hover:border-brand-border/80'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp size={18} className={tipo === 'movimentacao' ? 'text-brand-green' : 'text-brand-muted'} />
              <span className={`text-sm font-semibold ${tipo === 'movimentacao' ? 'text-brand-green' : 'text-brand-muted'}`}>
                Movimentação
              </span>
            </div>
            <p className="text-xs text-brand-muted">Compra ou venda de ativo</p>
          </button>

          <button
            onClick={() => setTipo('tese')}
            className={`card p-4 text-center transition-all ${
              tipo === 'tese'
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'hover:border-brand-border/80'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <BookOpen size={18} className={tipo === 'tese' ? 'text-yellow-400' : 'text-brand-muted'} />
              <span className={`text-sm font-semibold ${tipo === 'tese' ? 'text-yellow-400' : 'text-brand-muted'}`}>
                Tese
              </span>
            </div>
            <p className="text-xs text-brand-muted">Análise de investimento</p>
          </button>
        </div>

        {/* Campos de Movimentação */}
        {tipo === 'movimentacao' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="card p-5 space-y-4"
          >
            <div>
              <label className="block text-sm text-brand-muted mb-2">Tipo de operação</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSubtipo('compra')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    subtipo === 'compra'
                      ? 'border-brand-green bg-brand-green/10 text-brand-green'
                      : 'border-brand-border text-brand-muted hover:border-brand-green/50'
                  }`}
                >
                  <TrendingUp size={15} /> Compra
                </button>
                <button
                  onClick={() => setSubtipo('venda')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    subtipo === 'venda'
                      ? 'border-red-400 bg-red-500/10 text-red-400'
                      : 'border-brand-border text-brand-muted hover:border-red-400/50'
                  }`}
                >
                  <TrendingDown size={15} /> Venda
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-brand-muted mb-2">Ativo *</label>
              <input
                type="text"
                value={ativoNome}
                onChange={(e) => setAtivoNome(e.target.value.toUpperCase())}
                placeholder="Ex: PETR4, Bitcoin, MXRF11"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm text-brand-muted mb-2">Classe do ativo</label>
              <select
                value={ativoClasse}
                onChange={(e) => setAtivoClasse(e.target.value as AssetClasse)}
                className="input appearance-none"
              >
                {CLASSES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-brand-muted mb-2">Data da operação</label>
              <input
                type="date"
                value={dataOp}
                onChange={(e) => setDataOp(e.target.value)}
                className="input"
              />
            </div>
          </motion.div>
        )}

        {/* Conteúdo */}
        <div className="card p-5">
          <label className="block text-sm text-brand-muted mb-2">
            {tipo === 'tese' ? 'Tese de investimento *' : 'Comentário (opcional)'}
          </label>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder={
              tipo === 'tese'
                ? 'Compartilhe sua análise, fundamentos e perspectivas...'
                : 'Por que fez essa operação? Qual sua estratégia?'
            }
            rows={5}
            maxLength={1000}
            className="input resize-none"
          />
          <p className="text-xs text-brand-muted text-right mt-1">{conteudo.length}/1000</p>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="btn-outline flex-1">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <>
                <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <><Save size={16} /> Salvar alterações</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
