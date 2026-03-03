'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck, X } from 'lucide-react'
import { useNotificacoes, type Notification } from '@/hooks/useNotificacoes'
import { tempoRelativo } from '@/lib/utils'
import Link from 'next/link'

function iconeNotif(tipo: Notification['tipo']) {
  if (tipo === 'curtida')    return <Heart size={14} className="text-red-400" />
  if (tipo === 'comentario') return <MessageCircle size={14} className="text-blue-400" />
  if (tipo === 'seguiu')     return <UserPlus size={14} className="text-brand-green" />
}

function subTextoNotif(n: Notification) {
  if (!n.post) return null
  return n.post.ativo_nome ?? n.post.conteudo?.slice(0, 60) ?? null
}

export default function NotificacoesPage() {
  const { notificacoes, naoLidas, loading, marcarTodasLidas, deletar } = useNotificacoes()

  // Marca todas como lidas automaticamente ao abrir a página
  useEffect(() => {
    if (!loading && naoLidas > 0) {
      marcarTodasLidas()
    }
  }, [loading])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-white" />
          <h1 className="text-xl font-bold text-white">Notificações</h1>
        </div>
        {notificacoes.length > 0 && (
          <button
            onClick={() => {/* limpar todas futuramente */}}
            className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-green transition-colors"
          >
            <CheckCheck size={14} />
            Todas lidas ao abrir
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="card p-4 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-surface shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-brand-surface rounded w-48 mb-2" />
                <div className="h-2 bg-brand-surface rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && notificacoes.length === 0 && (
        <div className="card p-12 text-center">
          <Bell size={40} className="text-brand-muted mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Nenhuma notificação</p>
          <p className="text-brand-muted text-sm">
            Quando alguém curtir, comentar ou te seguir, você verá aqui.
          </p>
        </div>
      )}

      {/* Lista */}
      {!loading && notificacoes.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {notificacoes.map((n, i) => {
              const href = n.post_id
                ? `/main/post/${n.post_id}`
                : `/main/perfil/${n.actor_id}`
              const sub = subTextoNotif(n)

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="card p-4 flex items-start gap-3 transition-colors"
                >
                  {/* Avatar do ator */}
                  <Link href={`/main/perfil/${n.actor_id}`} className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border overflow-hidden hover:border-brand-green transition-colors relative">
                      {n.actor?.foto_url ? (
                        <img src={n.actor.foto_url} alt={n.actor.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-muted">
                          {n.actor?.nome?.[0]?.toUpperCase()}
                        </div>
                      )}
                      {/* Ícone do tipo no canto */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-card border border-brand-border flex items-center justify-center">
                        {iconeNotif(n.tipo)}
                      </div>
                    </div>
                  </Link>

                  {/* Texto */}
                  <Link href={href} className="flex-1 min-w-0 group">
                    <p className="text-sm text-white leading-snug group-hover:text-brand-green transition-colors">
                      <span className="font-semibold">@{n.actor?.username}</span>
                      {' '}
                      {n.tipo === 'curtida'    && 'curtiu seu post'}
                      {n.tipo === 'comentario' && 'comentou no seu post'}
                      {n.tipo === 'seguiu'     && 'começou a te seguir'}
                    </p>
                    {sub && (
                      <p className="text-xs text-brand-muted mt-0.5 truncate">"{sub}"</p>
                    )}
                    <p className="text-xs text-brand-muted mt-1">
                      {tempoRelativo(n.created_at)}
                    </p>
                  </Link>

                  {/* Remover */}
                  <button
                    onClick={() => deletar(n.id)}
                    title="Remover"
                    className="p-1.5 text-brand-muted hover:text-red-400 transition-colors rounded-lg hover:bg-brand-surface shrink-0"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
