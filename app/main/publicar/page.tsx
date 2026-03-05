'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, BookOpen, ChevronDown, BarChart2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ASSET_CLASSE_LABELS, AssetClasse } from '@/types'
import { calcularScore } from '@/lib/relevancia'
import { CriarEnquete } from '@/components/enquetes/CriarEnquete'
import toast from 'react-hot-toast'

type TipoPost = 'movimentacao' | 'tese' | 'enquete'
type Subtipo  = 'compra' | 'venda'

const CLASSES = Object.entries(ASSET_CLASSE_LABELS) as [AssetClasse, string][]

export default function PublicarPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [tipo,        setTipo]        = useState<TipoPost>('movimentacao')
  const [subtipo,     setSubtipo]     = useState<Subtipo>('compra')
  const [ativoNome,   setAtivoNome]   = useState('')
  const [ativoClasse, setAtivoClasse] = useState<AssetClasse>('acao_br')
  const [dataOp,      setDataOp]      = useState(new Date().toISOString().split('T')[0])
  const [conteudo,    setConteudo]    = useState('')
  const [carregando,  setCarregando]  = useState(false)

  const handlePublicar = async () => {
    if (!user) { toast.error('Faça login para publicar'); return }
    if (tipo === 'movimentacao' && !ativoNome.trim()) { toast.error('Informe o nome do ativo'); return }
    if (tipo === 'tese' && !conteudo.trim()) { toast.error('Escreva o conteúdo da tese'); return }

    setCarregando(true)

    const score = calcularScore({ likes: 0, comments: 0, seguidores_autor: 0, created_at: new Date().toISOString() })

    const { error } = await supabase.from('posts').insert({
      user_id:          user.id,
      tipo,
      subtipo:          tipo === 'movimentacao' ? subtipo : null,
      ativo_nome:       ativoNome.trim() || null,
      ativo_classe:     tipo === 'movimentacao' ? ativoClasse : null,
      conteudo:         conteudo.trim() || null,
      data_operacao:    tipo === 'movimentacao' ? dataOp : null,
      score_relevancia: score,
    })

    setCarregando(false)

    if (error) {
      toast.error('Erro ao publicar. Tente novamente.')
    } else {
      toast.success('Post publicado! 🚀')
      router.push('/main/feed')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-6">Nova publicação</h1>

      {/* Seletor de tipo — agora com 3 opções */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setTipo('movimentacao')}
          className={`card p-4 text-center transition-all ${tipo === 'movimentacao' ? 'border-brand-green bg-brand-green/5' : 'hover:border-brand-border/80'}`}
        >
          <TrendingUp size={22} className={`mx-auto mb-2 ${tipo === 'movimentacao' ? 'text-brand-green' : 'text-brand-muted'}`} />
          <p className={`text-xs font-semibold ${tipo === 'movimentacao' ? 'text-brand-green' : 'text-brand-muted'}`}>Movimentação</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Compra ou venda</p>
        </button>

        <button
          onClick={() => setTipo('tese')}
          className={`card p-4 text-center transition-all ${tipo === 'tese' ? 'border-purple-500 bg-purple-500/5' : 'hover:border-brand-border/80'}`}
        >
          <BookOpen size={22} className={`mx-auto mb-2 ${tipo === 'tese' ? 'text-purple-400' : 'text-brand-muted'}`} />
          <p className={`text-xs font-semibold ${tipo === 'tese' ? 'text-purple-400' : 'text-brand-muted'}`}>Tese</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Análise</p>
        </button>

        <button
          onClick={() => setTipo('enquete')}
          className={`card p-4 text-center transition-all ${tipo === 'enquete' ? 'border-yellow-500 bg-yellow-500/5' : 'hover:border-brand-border/80'}`}
        >
          <BarChart2 size={22} className={`mx-auto mb-2 ${tipo === 'enquete' ? 'text-yellow-400' : 'text-brand-muted'}`} />
          <p className={`text-xs font-semibold ${tipo === 'enquete' ? 'text-yellow-400' : 'text-brand-muted'}`}>Enquete</p>
          <p className="text-[10px] text-brand-muted mt-0.5">48 horas</p>
        </button>
      </div>

      {/* Enquete — usa o componente dedicado */}
      {tipo === 'enquete' && <CriarEnquete />}

      {/* Movimentação ou Tese */}
      {tipo !== 'enquete' && (
        <motion.div key={tipo} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-5">

          {tipo === 'movimentacao' && (
            <>
              <div>
                <label className="block text-sm text-brand-muted mb-2">Tipo de operação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setSubtipo('compra')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${subtipo === 'compra' ? 'border-brand-green bg-brand-green/10 text-brand-green' : 'border-brand-border text-brand-muted hover:border-brand-green/50'}`}
                  >
                    <TrendingUp size={16} /><span className="font-semibold">Compra</span>
                  </button>
                  <button onClick={() => setSubtipo('venda')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${subtipo === 'venda' ? 'border-red-400 bg-red-400/10 text-red-400' : 'border-brand-border text-brand-muted hover:border-red-400/50'}`}
                  >
                    <TrendingDown size={16} /><span className="font-semibold">Venda</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Nome do ativo *</label>
                <input type="text" value={ativoNome} onChange={(e) => setAtivoNome(e.target.value)} placeholder="Ex: Bitcoin, PETR4, AAPL..." className="input" />
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Classe do ativo</label>
                <div className="relative">
                  <select value={ativoClasse} onChange={(e) => setAtivoClasse(e.target.value as AssetClasse)} className="input appearance-none pr-10">
                    {CLASSES.map(([valor, label]) => (<option key={valor} value={valor}>{label}</option>))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Data da operação</label>
                <input type="date" value={dataOp} onChange={(e) => setDataOp(e.target.value)} max={new Date().toISOString().split('T')[0]} className="input" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-brand-muted mb-2">
              {tipo === 'tese' ? 'Tese de investimento *' : 'Comentário / Tese (opcional)'}
            </label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={tipo === 'tese' ? 'Descreva sua análise...' : 'Por que você fez esta operação?'}
              maxLength={tipo === 'tese' ? 2000 : 500}
              rows={tipo === 'tese' ? 6 : 3}
              className="input resize-none"
            />
            <p className="text-xs text-brand-muted mt-1 text-right">{conteudo.length}/{tipo === 'tese' ? 2000 : 500}</p>
          </div>

          <button onClick={handlePublicar} disabled={carregando} className="btn-primary w-full">
            {carregando
              ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />Publicando...</span>
              : 'Publicar 🚀'
            }
          </button>
        </motion.div>
      )}
    </div>
  )
}
