'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Heart, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { tempoRelativo, formatarNumero, cn } from '@/lib/utils'
import { ASSET_CLASSE_LABELS } from '@/types'
import type { Post, Comment, Profile } from '@/types'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { criarNotificacao } from '@/lib/notificacoes'

type CommentWithProfile = Comment & { profiles: Profile }

export default function PostDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const postId   = params.id as string
  const { user } = useAuth()

  const [post,        setPost]        = useState<(Post & { profiles: Profile }) | null>(null)
  const [comments,    setComments]    = useState<CommentWithProfile[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [likesCount,  setLikesCount]  = useState(0)
  const [jaCurtiu,    setJaCurtiu]    = useState(false)
  const [enviando,    setEnviando]    = useState(false)
  const [carregando,  setCarregando]  = useState(true)

  useEffect(() => {
    if (postId) carregarPost()
  }, [postId, user])

  const carregarPost = async () => {
    setCarregando(true)

    const [{ data: postData }, { data: commentsData }, { count: likesTotal }] = await Promise.all([
      supabase
        .from('posts')
        .select('*, profiles:user_id(*)')
        .eq('id', postId)
        .single(),
      supabase
        .from('comments')
        .select('*, profiles:user_id(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
    ])

    setPost(postData)
    setComments(commentsData ?? [])
    setLikesCount(likesTotal ?? 0)

    if (user) {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('user_id', user.id)
      setJaCurtiu((count ?? 0) > 0)
    }

    setCarregando(false)
  }

  const handleCurtir = async () => {
    if (!user) { toast.error('Faça login para curtir'); return }

    if (jaCurtiu) {
      await supabase.from('likes').delete()
        .eq('post_id', postId).eq('user_id', user.id)
      setJaCurtiu(false)
      setLikesCount((n) => n - 1)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
      setJaCurtiu(true)
      setLikesCount((n) => n + 1)
    }
  }

  const handleComentar = async () => {
    if (!user) { toast.error('Faça login para comentar'); return }
    if (!novoComentario.trim()) return

    setEnviando(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id:  postId,
        user_id:  user.id,
        conteudo: novoComentario.trim(),
      })
      .select('*, profiles:user_id(*)')
      .single()

    setEnviando(false)

    if (error) {
      toast.error('Erro ao comentar')
    } else {
      setComments((prev) => [...prev, data])
      setNovoComentario('')
      // Notifica o dono do post
      if (post && post.user_id !== user.id) {
        await criarNotificacao({
          userId:  post.user_id,
          actorId: user.id,
          tipo:    'comentario',
          postId:  postId,
        })
      }
    }
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-10 animate-pulse">
          <div className="flex gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-surface" />
            <div className="flex-1">
              <div className="h-3 bg-brand-surface rounded w-32 mb-2" />
              <div className="h-2 bg-brand-surface rounded w-20" />
            </div>
          </div>
          <div className="h-3 bg-brand-surface rounded w-full mb-2" />
          <div className="h-3 bg-brand-surface rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-10 text-center">
          <p className="text-brand-muted">Post não encontrado</p>
        </div>
      </div>
    )
  }

  const autor = post.profiles

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Botão voltar */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-brand-muted hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Voltar</span>
      </button>

      {/* Post principal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 mb-4"
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
                {autor?.nome}
              </p>
              <p className="text-xs text-brand-muted">@{autor?.username} · {tempoRelativo(post.created_at)}</p>
            </div>
          </Link>

          <div>
            {post.tipo === 'movimentacao' ? (
              post.subtipo === 'compra'
                ? <span className="badge-compra flex items-center gap-1"><TrendingUp size={10} /> COMPRA</span>
                : <span className="badge-venda flex items-center gap-1"><TrendingDown size={10} /> VENDA</span>
            ) : (
              <span className="badge-tese">💡 TESE</span>
            )}
          </div>
        </div>

        {/* Ativo */}
        {post.tipo === 'movimentacao' && post.ativo_nome && (
          <div className="mb-4 p-3 bg-brand-surface rounded-xl border border-brand-border">
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

        {/* Conteúdo completo */}
        {post.conteudo && (
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{post.conteudo}</p>
        )}

        {/* Ações */}
        <div className="flex items-center gap-4 pt-3 border-t border-brand-border/50">
          <button
            onClick={handleCurtir}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors',
              jaCurtiu ? 'text-red-400' : 'text-brand-muted hover:text-red-400'
            )}
          >
            <Heart size={17} className={jaCurtiu ? 'fill-red-400' : ''} />
            <span>{formatarNumero(likesCount)}</span>
          </button>
          <span className="text-xs text-brand-muted">{comments.length} comentário{comments.length !== 1 ? 's' : ''}</span>
        </div>
      </motion.div>

      {/* Caixa de comentário */}
      {user && (
        <div className="card p-4 mb-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border shrink-0 flex items-center justify-center text-xs font-bold text-brand-muted">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComentar()}
                placeholder="Escreva um comentário..."
                maxLength={500}
                className="input text-sm py-2 flex-1"
              />
              <button
                onClick={handleComentar}
                disabled={enviando || !novoComentario.trim()}
                className="btn-primary px-3 py-2 disabled:opacity-50"
              >
                {enviando
                  ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de comentários */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-brand-muted text-sm">Nenhum comentário ainda. Seja o primeiro! 💬</p>
          </div>
        ) : (
          comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="flex gap-3">
                <Link href={`/main/perfil/${comment.profiles?.id}`}>
                  <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                    {comment.profiles?.foto_url ? (
                      <img src={comment.profiles.foto_url} alt={comment.profiles.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-muted">
                        {comment.profiles?.nome?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{comment.profiles?.nome}</span>
                    <span className="text-xs text-brand-muted">@{comment.profiles?.username}</span>
                    <span className="text-xs text-brand-muted">· {tempoRelativo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{comment.conteudo}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
