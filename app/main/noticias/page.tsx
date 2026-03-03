'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { NoticiaCard } from '@/components/feed/NoticiaCard'
import { useNoticias } from '@/hooks/useNoticias'
import { RefreshCw, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuoteBar } from '@/components/cotacoes/QuoteBar'

type Categoria = 'todas' | 'cripto' | 'acoes' | 'economia' | 'global'

const CATEGORIAS: { id: Categoria; label: string; cor: string }[] = [
  { id: 'todas',    label: 'Todas',    cor: 'bg-brand-green text-brand-dark'       },
  { id: 'cripto',   label: 'Cripto',   cor: 'bg-brand-green/20 text-brand-green'   },
  { id: 'acoes',    label: 'Ações',    cor: 'bg-blue-500/20 text-blue-400'          },
  { id: 'economia', label: 'Economia', cor: 'bg-yellow-500/20 text-yellow-400'      },
  { id: 'global',   label: 'Global',   cor: 'bg-purple-500/20 text-purple-400'      },
]

export default function NoticiasPage() {
  const { noticias, loading, atualizar } = useNoticias()
  const [categoria,   setCategoria]   = useState<Categoria>('todas')
  const [atualizando, setAtualizando] = useState(false)

  const handleAtualizar = async () => {
    setAtualizando(true)
    await atualizar()
    setTimeout(() => setAtualizando(false), 800)
  }

  const filtradas = categoria === 'todas'
    ? noticias
    : noticias.filter((n) => n.categoria === categoria)

  const contagem = (cat: Categoria) =>
    cat === 'todas' ? noticias.length : noticias.filter((n) => n.categoria === cat).length

  return (
    <div className="min-h-screen">
      <QuoteBar />

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-blue-400" />
            <h1 className="text-lg font-bold text-white">Notícias do Mercado</h1>
            {!loading && noticias.length > 0 && (
              <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {noticias.length}
              </span>
            )}
          </div>

          <button
            onClick={handleAtualizar}
            className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-brand-surface border border-transparent hover:border-brand-border"
          >
            <RefreshCw size={13} className={atualizando ? 'animate-spin text-brand-green' : ''} />
            Atualizar
          </button>
        </div>

        {/* Filtros de categoria */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIAS.map(({ id, label }) => {
            const count  = contagem(id)
            const ativo  = categoria === id
            return (
              <button
                key={id}
                onClick={() => setCategoria(id)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                  ativo
                    ? 'border-brand-green bg-brand-green/10 text-brand-green'
                    : 'border-brand-border text-brand-muted hover:border-brand-green/50 hover:text-white'
                )}
              >
                {label}
                <span className={cn(
                  'text-xs rounded-full w-4 h-4 flex items-center justify-center',
                  ativo ? 'bg-brand-green text-brand-dark' : 'bg-brand-surface text-brand-muted'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Fonte info */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-brand-surface/50 rounded-xl border border-brand-border/50">
          <span className="text-xs text-brand-muted">
            📡 Fontes: Google News · InfoMoney · CoinTelegraph · CoinDesk
          </span>
          <span className="ml-auto text-xs text-brand-muted">Atualiza a cada 5 min</span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map((n) => (
              <div key={n} className="card p-4 animate-pulse flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-brand-surface shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="flex gap-2">
                    <div className="h-4 bg-brand-surface rounded-full w-16" />
                    <div className="h-4 bg-brand-surface rounded-full w-20" />
                  </div>
                  <div className="h-3 bg-brand-surface rounded w-full" />
                  <div className="h-3 bg-brand-surface rounded w-4/5" />
                  <div className="h-2 bg-brand-surface rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sem notícias */}
        {!loading && filtradas.length === 0 && (
          <div className="card p-10 text-center">
            <Newspaper size={36} className="text-brand-muted mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">
              {noticias.length === 0 ? 'Nenhuma notícia no momento' : 'Nenhuma notícia nesta categoria'}
            </p>
            <p className="text-brand-muted text-sm mb-4">
              {noticias.length === 0
                ? 'As fontes podem estar temporariamente indisponíveis'
                : 'Tente selecionar outra categoria'
              }
            </p>
            {noticias.length === 0 && (
              <button onClick={handleAtualizar} className="btn-primary mx-auto">
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Lista de notícias */}
        {!loading && filtradas.length > 0 && (
          <motion.div
            key={categoria}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {filtradas.map((n, idx) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
              >
                <NoticiaCard noticia={n} />
              </motion.div>
            ))}

            <p className="text-center text-xs text-brand-muted py-6">
              {filtradas.length} notícia{filtradas.length !== 1 ? 's' : ''} · Atualizado automaticamente a cada 5 minutos
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
