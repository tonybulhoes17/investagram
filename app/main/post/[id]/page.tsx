'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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

// ── Renderiza texto com @menções clicáveis ───────────────────
function TextoComMencoes({ texto }: { texto: string }) {
  const partes = texto.split(/(@\w+)/g)
  return (
    <>
      {partes.map((parte, i) =>
        parte.startsWith('@') ? (
          <Link
            key={i}
            href={`/main/busca?q=${parte.slice(1)}`}
            className="text-brand-green font-semibold hover:underline"
          >
            {parte}
          </Link>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  )
}

export default function PostDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const postId   = params.id as string
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [post,             setPost]             = useState<(Post & { profiles: Profile }) | null>(null)
  const [comments,         setComments]         = useState<CommentWithProfile[]>([])
  const [novoComentario,   setNovoComentario]   = useState('')
  const [likesCount,       setLikesCount]       = useState(0)
  const [jaCurtiu,         setJaCurtiu]         = useState(false)
  const [enviando,         setEnviando]         = useState(false)
  const [carregando,       setCarregando]       = useState(true)

  // Autocomplete @menção
  const [mencaoQuery,      setMencaoQuery]      = useState('')
  const [mencaoSugestoes,  setMencaoSugestoes]  = useState<Profile[]>([])
  const [mencaoAberta,     setMencaoAberta]     = useState(false)
  const [mencaoIndex,      setMencaoIndex]      = useState(-1)

  useEffect(() => { if (postId) carregarPost() }, [postId, user])

  // Busca sugestões ao digitar @
  useEffect(() => {
    if (!mencaoQuery) { setMencaoSugestoes([]); setMencaoAberta(false); return }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, username, foto_url')
        .ilike('username', `${mencaoQuery}%`)
        .limit(5)
      setMencaoSugestoes((data as Profile[]) ?? [])
      setMencaoAberta(true)
      setMencaoIndex(-1)
    }, 200)
    return () => clearTimeout(timeout)
  }, [mencaoQuery])

  const carregarPost = async () => {
    setCarregando(true)
    const [{ data: postData }, { data: commentsData }, { count: likesTotal }] = await Promise.all([
      supabase.from('posts').select('*, profiles:user_id(*)').eq('id', postId).single(),
      supabase.from('comments').select('*, profiles:user_id(*)').eq('post_id', postId).order('created_at', { ascending: true }),
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
    ])
    setPost(postData)
    setComments(commentsData ?? [])
    setLikesCount(likesTotal ?? 0)
    if (user) {
      const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('user_id', user.id)
      setJaCurtiu((count ?? 0) > 0)
    }
    setCarregando(false)
  }

  const handleCurtir = async () => {
    if (!user) { toast.error('Faça login para curtir'); return }
    if (jaCurtiu) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
      setJaCurtiu(false)
      setLikesCount((n) => n - 1)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
      setJaCurtiu(true)
      setLikesCount((n) => n + 1)
    }
  }

  // Detecta @ no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNovoComentario(val)

    // Detecta @palavra no final ou no meio do texto
    const match = val.match(/@(\w*)$/)
    if (match) {
      setMencaoQuery(match[1])
    } else {
      setMencaoQuery('')
      setMencaoAberta(false)
    }
  }

  // Seleciona sugestão de @menção
  const selecionarMencao = (perfil: Profile) => {
    const novoTexto = novoComentario.replace(/@(\w*)$/, `@${perfil.username} `)
    setNovoComentario(novoTexto)
    setMencaoAberta(false)
    setMencaoQuery('')
    inputRef.current?.focus()
  }

  // Navega sugestões com teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mencaoAberta && mencaoSugestoes.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMencaoIndex((i) => Math.min(i + 1, mencaoSugestoes.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMencaoIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && mencaoIndex >= 0) { e.preventDefault(); selecionarMencao(mencaoSugestoes[mencaoIndex]); return }
      if (e.key === 'Escape') { setMencaoAberta(false) }
    }
    if (e.key === 'Enter' && !e.shiftKey && !mencaoAberta) handleComentar()
  }

  const handleComentar = async () => {
    if (!user) { toast.error('Faça login para comentar'); return }
    if (!novoComentario.trim()) return

    setEnviando(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, conteudo: novoComentario.trim() })
      .select('*, profiles:user_id(*)')
      .single()

    setEnviando(false)

    if (error) {
      toast.error('Erro ao comentar')
    } else {
      setComments((prev) => [...prev, data])
      setNovoComentario('')
      setMencaoAberta(false)

      // Notifica dono do post
      if (post && post.user_id !== user.id) {
        await criarNotificacao({ userId: post.user_id, actorId: user.id, tipo: 'comentario', postId })
      }

      // Notifica usuários mencionados
      const mencoes = novoComentario.match(/@(\w+)/g) ?? []
      for (const mencao of mencoes) {
        const username = mencao.slice(1)
        const { data: perfilMencao } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single()
        if (perfilMencao && perfilMencao.id !== user.id && perfilMencao.id !== post?.user_id) {
          await criarNotificacao({ userId: perfilMencao.id, actorId: user.id, tipo: 'comentario', postId })
        }
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
      <button onClick={() => router.back()} className="flex items-center gap-2 text-brand-muted hover:text-white transition-colors mb-4">
        <ArrowLeft size={16} />
        <span className="text-sm">Voltar</span>
      </button>

      {/* Post principal */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <Link href={`/main/perfil/${autor?.id}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
              {autor?.foto_url
                ? <img src={autor.foto_url} alt={autor.nome} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-brand-muted font-bold">{autor?.nome?.[0]?.toUpperCase() ?? '?'}</div>
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors">{autor?.nome}</p>
              <p className="text-xs text-brand-muted">@{autor?.username} · {tempoRelativo(post.created_at)}</p>
            </div>
          </Link>
          <div>
            {post.tipo === 'movimentacao'
              ? post.subtipo === 'compra'
                ? <span className="badge-compra flex items-center gap-1"><TrendingUp size={10} /> COMPRA</span>
                : <span className="badge-venda flex items-center gap-1"><TrendingDown size={10} /> VENDA</span>
              : <span className="badge-tese">💡 TESE</span>
            }
          </div>
        </div>

        {post.tipo === 'movimentacao' && post.ativo_nome && (
          <div className="mb-4 p-3 bg-brand-surface rounded-xl border border-brand-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{post.ativo_nome}</p>
                {post.ativo_classe && <p className="text-xs text-brand-muted mt-0.5">{ASSET_CLASSE_LABELS[post.ativo_classe as keyof typeof ASSET_CLASSE_LABELS]}</p>}
              </div>
              {post.data_operacao && <p className="text-xs text-brand-muted">{new Date(post.data_operacao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
            </div>
          </div>
        )}

        {post.conteudo && <p className="text-sm text-gray-300 leading-relaxed mb-4">{post.conteudo}</p>}

        <div className="flex items-center gap-4 pt-3 border-t border-brand-border/50">
          <button onClick={handleCurtir} className={cn('flex items-center gap-1.5 text-sm transition-colors', jaCurtiu ? 'text-red-400' : 'text-brand-muted hover:text-red-400')}>
            <Heart size={17} className={jaCurtiu ? 'fill-red-400' : ''} />
            <span>{formatarNumero(likesCount)}</span>
          </button>
          <span className="text-xs text-brand-muted">{comments.length} comentário{comments.length !== 1 ? 's' : ''}</span>
        </div>
      </motion.div>

      {/* Caixa de comentário com @menção */}
      {user && (
        <div className="card p-4 mb-4 relative">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border shrink-0 flex items-center justify-center text-xs font-bold text-brand-muted">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2 relative">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={novoComentario}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva um comentário... use @ para mencionar"
                  maxLength={500}
                  className="input text-sm py-2 w-full"
                />

                {/* Sugestões de @menção */}
                <AnimatePresence>
                  {mencaoAberta && mencaoSugestoes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute bottom-full mb-1 left-0 right-0 bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden z-30"
                    >
                      {mencaoSugestoes.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => selecionarMencao(p)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                            i === mencaoIndex ? 'bg-brand-green/10' : 'hover:bg-brand-surface'
                          )}
                        >
                          <div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                            {p.foto_url
                              ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-brand-muted">{p.nome[0].toUpperCase()}</div>
                            }
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{p.nome}</p>
                            <p className="text-xs text-brand-muted">@{p.username}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleComentar}
                disabled={enviando || !novoComentario.trim()}
                className="btn-primary px-3 py-2 disabled:opacity-50 self-start"
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
            <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <div className="flex gap-3">
                <Link href={`/main/perfil/${comment.profiles?.id}`}>
                  <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                    {comment.profiles?.foto_url
                      ? <img src={comment.profiles.foto_url} alt={comment.profiles.nome} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-muted">{comment.profiles?.nome?.[0]?.toUpperCase() ?? '?'}</div>
                    }
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{comment.profiles?.nome}</span>
                    <span className="text-xs text-brand-muted">@{comment.profiles?.username}</span>
                    <span className="text-xs text-brand-muted">· {tempoRelativo(comment.created_at)}</span>
                  </div>
                  {/* Texto com @menções clicáveis */}
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <TextoComMencoes texto={comment.conteudo} />
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
