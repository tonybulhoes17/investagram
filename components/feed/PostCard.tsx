'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { tempoRelativo, formatarNumero, cn } from '@/lib/utils'
import { ASSET_CLASSE_LABELS } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { criarNotificacao } from '@/lib/notificacoes'
import type { FeedItem } from '@/types'
import toast from 'react-hot-toast'

type Props = {
  post:     FeedItem
  onCurtir: (postId: string) => void
  onDeletar?: (postId: string) => void
}

export function PostCard({ post, onCurtir, onDeletar }: Props) {
  const router = useRouter()
  const { user } = useAuth()

  const [expandido,    setExpandido]    = useState(false)
  const [copiado,      setCopiado]      = useState(false)
  const [menuAberto,   setMenuAberto]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletando,    setDeletando]    = useState(false)

  const autor       = post.profiles
  const temConteudo = (post.conteudo?.length ?? 0) > 200
  const ehMeuPost   = user?.id === post.user_id

  const handleCompartilhar = async () => {
    const url = `${window.location.origin}/main/post/${post.id}`
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const handleDeletar = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    setDeletando(false)
    if (error) {
      toast.error('Erro ao deletar post')
    } else {
      toast.success('Post deletado')
      onDeletar?.(post.id)
    }
    setMenuAberto(false)
    setConfirmDelete(false)
  }

  const handleEditar = () => {
    router.push(`/main/publicar/editar/${post.id}`)
    setMenuAberto(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="card p-5 hover:border-brand-green/30 transition-colors duration-200"
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-4">
        <Link href={`/main/perfil/${autor?.id}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
            {autor?.foto_url ? (
              <img src={autor.foto_url} alt={autor.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-muted font-bold">
                {autor?.nome?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors">
              {autor?.nome ?? 'Usuário'}
            </p>
            <p className="text-xs text-brand-muted">@{autor?.username} · {tempoRelativo(post.created_at)}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Badge tipo */}
          {post.tipo === 'movimentacao' ? (
            post.subtipo === 'compra'
              ? <span className="badge-compra flex items-center gap-1"><TrendingUp size={10} /> COMPRA</span>
              : <span className="badge-venda flex items-center gap-1"><TrendingDown size={10} /> VENDA</span>
          ) : (
            <span className="badge-tese">💡 TESE</span>
          )}

          {/* Menu 3 pontos — só aparece no próprio post */}
          {ehMeuPost && (
            <div className="relative">
              <button
                onClick={() => { setMenuAberto(!menuAberto); setConfirmDelete(false) }}
                className="p-1.5 text-brand-muted hover:text-white transition-colors rounded-lg hover:bg-brand-surface"
              >
                <MoreVertical size={15} />
              </button>

              <AnimatePresence>
                {menuAberto && (
                  <>
                    {/* Overlay para fechar */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => { setMenuAberto(false); setConfirmDelete(false) }}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-8 z-20 bg-brand-card border border-brand-border rounded-xl shadow-xl min-w-[160px] overflow-hidden"
                    >
                      <button
                        onClick={handleEditar}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white hover:bg-brand-surface transition-colors"
                      >
                        <Pencil size={14} className="text-brand-muted" />
                        Editar post
                      </button>

                      {!confirmDelete ? (
                        <button
                          onClick={handleDeletar}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-brand-border"
                        >
                          <Trash2 size={14} />
                          Deletar post
                        </button>
                      ) : (
                        <div className="border-t border-brand-border">
                          <p className="text-xs text-brand-muted px-4 pt-3 pb-1">Confirmar exclusão?</p>
                          <div className="flex gap-2 px-4 pb-3">
                            <button
                              onClick={() => setConfirmDelete(false)}
                              className="flex-1 text-xs py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleDeletar}
                              disabled={deletando}
                              className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {deletando ? '...' : 'Deletar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Ativo (para movimentações) */}
      {post.tipo === 'movimentacao' && post.ativo_nome && (
        <div className="mb-3 p-3 bg-brand-surface rounded-xl border border-brand-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{post.ativo_nome}</p>
              {post.ativo_classe && (
                <p className="text-xs text-brand-muted mt-0.5">
                  {ASSET_CLASSE_LABELS[post.ativo_classe as keyof typeof ASSET_CLASSE_LABELS]}
                </p>
              )}
            </div>
            {post.data_operacao && (
              <p className="text-xs text-brand-muted">
                {new Date(post.data_operacao + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo / Tese */}
      {post.conteudo && (
        <div className="mb-4">
          <p className={cn(
            'text-sm text-gray-300 leading-relaxed',
            !expandido && temConteudo && 'line-clamp-3'
          )}>
            {post.conteudo}
          </p>
          {temConteudo && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="flex items-center gap-1 text-xs text-brand-green hover:underline mt-1"
            >
              {expandido ? <><ChevronUp size={12} /> Mostrar menos</> : <><ChevronDown size={12} /> Ler mais</>}
            </button>
          )}
        </div>
      )}

      {/* Rodapé: ações */}
      <div className="flex items-center gap-4 pt-3 border-t border-brand-border/50">
        <button
          onClick={async () => {
            onCurtir(post.id)
            // Dispara notificação só quando está curtindo (não descurtindo)
            if (!post.ja_curtiu && user && post.user_id !== user.id) {
              await criarNotificacao({
                userId:  post.user_id,
                actorId: user.id,
                tipo:    'curtida',
                postId:  post.id,
              })
            }
          }}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            post.ja_curtiu ? 'text-red-400' : 'text-brand-muted hover:text-red-400'
          )}
        >
          <motion.div animate={post.ja_curtiu ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
            <Heart size={17} className={post.ja_curtiu ? 'fill-red-400' : ''} />
          </motion.div>
          <span>{formatarNumero(post._count_likes)}</span>
        </button>

        <Link
          href={`/main/post/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition-colors"
        >
          <MessageCircle size={17} />
          <span>{formatarNumero(post._count_comments)}</span>
        </Link>

        <button
          onClick={handleCompartilhar}
          className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-green transition-colors ml-auto"
        >
          <Share2 size={15} />
          <span className="text-xs">{copiado ? 'Copiado!' : 'Compartilhar'}</span>
        </button>
      </div>
    </motion.div>
  )
}
