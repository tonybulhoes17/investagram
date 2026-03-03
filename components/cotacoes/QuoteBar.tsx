'use client'

import { useCotacoes } from '@/hooks/useCotacoes'
import { formatarBRL, formatarVariacao, corVariacao } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type QuoteItemProps = {
  simbolo: string
  preco:   number
  variacao: number
}

function QuoteItem({ simbolo, preco, variacao }: QuoteItemProps) {
  const positivo = variacao >= 0

  return (
    <div className="flex items-center gap-2 px-4 py-1 shrink-0">
      <span className="text-xs font-bold text-white">{simbolo}</span>
      <span className="text-xs text-brand-muted">
        {preco > 0 ? formatarBRL(preco) : '—'}
      </span>
      {preco > 0 && (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${corVariacao(variacao)}`}>
          {positivo
            ? <TrendingUp size={10} />
            : <TrendingDown size={10} />
          }
          {formatarVariacao(variacao)}
        </span>
      )}
    </div>
  )
}

export function QuoteBar() {
  const { cotacoes, loading } = useCotacoes()

  if (loading) {
    return (
      <div className="bg-brand-card border-b border-brand-border h-9 flex items-center justify-center">
        <RefreshCw size={12} className="text-brand-muted animate-spin" />
        <span className="text-xs text-brand-muted ml-2">Carregando cotações...</span>
      </div>
    )
  }

  if (!cotacoes) return null

  const items = [
    cotacoes.BTC,
    cotacoes.ETH,
    cotacoes.IBOV,
    cotacoes.DOLAR,
    cotacoes.PETR4,
  ]

  return (
    <div className="bg-brand-card border-b border-brand-border overflow-hidden h-9">
      {/* Ticker scrollando infinito */}
      <div className="flex items-center h-full relative">
        {/* Gradiente esquerda */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-brand-card to-transparent z-10 pointer-events-none" />
        {/* Gradiente direita */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-brand-card to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex items-center"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          {/* Duplicado para loop infinito */}
          {[...items, ...items].map((item, idx) => (
            <div key={idx} className="flex items-center">
              <QuoteItem
                simbolo={item.simbolo}
                preco={item.preco}
                variacao={item.variacao}
              />
              <span className="text-brand-border text-xs">|</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
