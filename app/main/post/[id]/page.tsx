'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Heart, TrendingUp, TrendingDown, Mic, X, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { tempoRelativo, formatarNumero, cn } from '@/lib/utils'
import { ASSET_CLASSE_LABELS } from '@/types'
import type { Post, Comment, Profile } from '@/types'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { criarNotificacao } from '@/lib/notificacoes'
import { AudioRecorder, AudioPlayer } from '@/components/AudioRecorder'

type CommentWithProfile = Comment & {
  profiles:          Profile
  _count_likes?:     number
  ja_curtiu?:        boolean
}

type LikeProfile = {
  id:       string
  nome:     string
  username: string
  foto_url: string | null
}

// ── Renderiza texto com @menções clicáveis ───────────────────
function TextoComMencoes({ texto }: { texto: string }) {
  const partes = texto.split(/(@\w+)/g)
  return (
    <>
      {partes.map((parte, i) =>
        parte.startsWith('@') ? (
          <Link key={i} href={`/main/busca?q=${parte.slice(1)}`} className="text-brand-green font-semibold hover:underline">
            {parte}
          </Link>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  )
}

// ── Modal de quem curtiu o comentário ────────────────────────
function ModalLikesComentario({ commentId, onClose }: { commentId: string; onClose: () => void }) {
  const [perfis,  setPerfis]  = useState<LikeProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('comment_likes')
      .select('user_id, profiles:user_id(id, nome, username, foto_url)')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPerfis((data ?? []).map((d: any) => d.profiles).filter(Boolean))
        setLoading(false)
      })
  }, [commentId])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{   opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-red-400 fill-red-400" />
              <h2 className="text-white font-semibold">Curtidas</h2>
              {!loading && <span className="text-xs text-brand-muted bg-brand-surface px-2 py-0.5 rounded-full">{perfis.length}</span>}
            </div>
            <button onClick={onClose} className="p-1.5 text-brand-muted hover:text-white transition-colors rounded-lg hover:bg-brand-surface">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-3">
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((n) => (
                  <div key={n} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-brand-surface shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-brand-surface rounded w-32 mb-1.5" />
                      <div className="h-2 bg-brand-surface rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && perfis.length === 0 && (
              <div className="py-8 text-center">
                <Heart size={28} className="text-brand-muted mx-auto mb-2" />
                <p className="text-brand-muted text-sm">Nenhuma curtida ainda</p>
              </div>
            )}
            {!loading && perfis.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/main/perfil/${p.id}`} onClick={onClose} className="flex items-center gap-3 p-2 rounded-xl hover:bg-brand-surface transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-muted">{p.nome[0].toUpperCase()}</div>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors truncate">{p.nome}</p>
                    <p className="text-xs text-brand-muted">@{p.username}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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

  // Áudio no comentário
  const [audioFile,        setAudioFile]        = useState<File | null>(null)
  const [audioPreviewUrl,  setAudioPreviewUrl]  = useState<string | null>(null)
  const [mostrarGravador,  setMostrarGravador]  = useState(false)

  // Autocomplete @menção
  const [mencaoQuery,      setMencaoQuery]      = useState('')
  const [mencaoSugestoes,  setMencaoSugestoes]  = useState<Profile[]>([])
  const [mencaoAberta,     setMencaoAberta]     = useState(false)
  const [mencaoIndex,      setMencaoIndex]      = useState(-1)

  // Likes de comentários
  const [modalLikesCommentId, setModalLikesCommentId] = useState<string | null>(null)

  // Deletar comentário
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletandoId,     setDeletandoId]     = useState<string | null>(null)

  useEffect(() => { if (postId) carregarPost() }, [postId, user])

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
    setLikesCount(likesTotal ?? 0)

    // Enriquece comentários com likes
    const commentsEnriquecidos = await enriquecerComentarios(commentsData ?? [])
    setComments(commentsEnriquecidos)

    if (user) {
      const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('user_id', user.id)
      setJaCurtiu((count ?? 0) > 0)
    }
    setCarregando(false)
  }

  const enriquecerComentarios = async (comentarios: any[]): Promise<CommentWithProfile[]> => {
    return Promise.all(
      comentarios.map(async (c) => {
        const { count: totalLikes } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', c.id)

        let ja_curtiu = false
        if (user) {
          const { count } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', c.id)
            .eq('user_id', user.id)
          ja_curtiu = (count ?? 0) > 0
        }

        return { ...c, _count_likes: totalLikes ?? 0, ja_curtiu }
      })
    )
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

  const handleCurtirComentario = async (commentId: string) => {
    if (!user) { toast.error('Faça login para curtir'); return }

    const comment = comments.find((c) => c.id === commentId)
    if (!comment) return

    if (comment.ja_curtiu) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
    }

    setComments((prev) => prev.map((c) => c.id !== commentId ? c : {
      ...c,
      ja_curtiu:    !c.ja_curtiu,
      _count_likes: c.ja_curtiu ? (c._count_likes ?? 1) - 1 : (c._count_likes ?? 0) + 1,
    }))
  }

  const handleDeletarComentario = async (commentId: string) => {
    if (confirmDeleteId !== commentId) {
      setConfirmDeleteId(commentId)
      return
    }
    setDeletandoId(commentId)
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    setDeletandoId(null)
    setConfirmDeleteId(null)
    if (error) {
      toast.error('Erro ao deletar comentário')
    } else {
      toast.success('Comentário deletado')
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNovoComentario(val)
    const match = val.match(/@(\w*)$/)
    if (match) {
      setMencaoQuery(match[1])
    } else {
      setMencaoQuery('')
      setMencaoAberta(false)
    }
  }

  const selecionarMencao = (perfil: Profile) => {
    const novoTexto = novoComentario.replace(/@(\w*)$/, `@${perfil.username} `)
    setNovoComentario(novoTexto)
    setMencaoAberta(false)
    setMencaoQuery('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mencaoAberta && mencaoSugestoes.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMencaoIndex((i) => Math.min(i + 1, mencaoSugestoes.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMencaoIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && mencaoIndex >= 0) { e.preventDefault(); selecionarMencao(mencaoSugestoes[mencaoIndex]); return }
      if (e.key === 'Escape') { setMencaoAberta(false) }
    }
    if (e.key === 'Enter' && !e.shiftKey && !mencaoAberta) handleComentar()
  }

  const uploadAudioComentario = async (): Promise<string | null> => {
    if (!audioFile || !user) return null
    const caminho = `${user.id}/audio-${Date.now()}.webm`
    const { error } = await supabase.storage.from('post-audios').upload(caminho, audioFile, { upsert: true })
    if (error) { toast.error('Erro ao enviar áudio'); return null }
    const { data } = supabase.storage.from('post-audios').getPublicUrl(caminho)
    return data.publicUrl
  }

  const handleComentar = async () => {
    if (!user) { toast.error('Faça login para comentar'); return }
    if (!novoComentario.trim() && !audioFile) return

    setEnviando(true)

    let audioUrl: string | null = null
    if (audioFile) audioUrl = await uploadAudioComentario()

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, conteudo: novoComentario.trim() || '', audio_url: audioUrl })
      .select('*, profiles:user_id(*)')
      .single()

    setEnviando(false)

    if (error) {
      toast.error('Erro ao comentar')
    } else {
      setComments((prev) => [...prev, { ...data, _count_likes: 0, ja_curtiu: false }])
      setNovoComentario('')
      setAudioFile(null)
      setAudioPreviewUrl(null)
      setMostrarGravador(false)

      if (post && post.user_id !== user.id) {
        await criarNotificacao({ userId: post.user_id, actorId: user.id, tipo: 'comentario', postId })
      }

      const mencoes = novoComentario.match(/@(\w+)/g) ?? []
      for (const mencao of mencoes) {
        const username = mencao.slice(1)
        const { data: perfilMencao } = await supabase.from('profiles').select('id').eq('username', username).single()
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
        {(post as any).audio_url && <AudioPlayer url={(post as any).audio_url} />}

        <div className="flex items-center gap-4 pt-3 border-t border-brand-border/50">
          <button onClick={handleCurtir} className={cn('flex items-center gap-1.5 text-sm transition-colors', jaCurtiu ? 'text-red-400' : 'text-brand-muted hover:text-red-400')}>
            <Heart size={17} className={jaCurtiu ? 'fill-red-400' : ''} />
            <span>{formatarNumero(likesCount)}</span>
          </button>
          <span className="text-xs text-brand-muted">{comments.length} comentário{comments.length !== 1 ? 's' : ''}</span>
        </div>
      </motion.div>

      {/* Caixa de comentário */}
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
                <AnimatePresence>
                  {mencaoAberta && mencaoSugestoes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="absolute bottom-full mb-1 left-0 right-0 bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden z-30"
                    >
                      {mencaoSugestoes.map((p, i) => (
                        <button key={p.id} onClick={() => selecionarMencao(p)}
                          className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors', i === mencaoIndex ? 'bg-brand-green/10' : 'hover:bg-brand-surface')}
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
                onClick={() => setMostrarGravador(!mostrarGravador)}
                type="button"
                className={`p-2 rounded-xl border transition-colors self-start ${mostrarGravador ? 'border-brand-green text-brand-green bg-brand-green/10' : 'border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green/50'}`}
              >
                <Mic size={15} />
              </button>

              <button
                onClick={handleComentar}
                disabled={enviando || (!novoComentario.trim() && !audioFile)}
                className="btn-primary px-3 py-2 disabled:opacity-50 self-start"
              >
                {enviando
                  ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mostrarGravador && !audioPreviewUrl && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3">
                <AudioRecorder
                  onAudioPronto={(file, url) => { setAudioFile(file); setAudioPreviewUrl(url); setMostrarGravador(false) }}
                  onCancelar={() => setMostrarGravador(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {audioPreviewUrl && (
            <div className="mt-3">
              <AudioPlayer url={audioPreviewUrl} />
              <button onClick={() => { setAudioFile(null); setAudioPreviewUrl(null) }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
              >
                <X size={11} /> Remover áudio
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de comentários */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-brand-muted text-sm">Nenhum comentário ainda. Seja o primeiro! 💬</p>
          </div>
        ) : (
          comments.map((comment) => {
            const ehMeuComentario = user?.id === comment.user_id
            const confirmando     = confirmDeleteId === comment.id
            const deletando       = deletandoId === comment.id

            return (
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
                  <div className="flex-1 min-w-0">
                    {/* Cabeçalho do comentário */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-white truncate">{comment.profiles?.nome}</span>
                        <span className="text-xs text-brand-muted shrink-0">@{comment.profiles?.username}</span>
                        <span className="text-xs text-brand-muted shrink-0">· {tempoRelativo(comment.created_at)}</span>
                      </div>

                      {/* Botão deletar — só para o autor */}
                      {ehMeuComentario && (
                        <button
                          onClick={() => {
                            if (confirmando) {
                              handleDeletarComentario(comment.id)
                            } else {
                              setConfirmDeleteId(comment.id)
                              // Auto-cancela após 3s
                              setTimeout(() => setConfirmDeleteId((prev) => prev === comment.id ? null : prev), 3000)
                            }
                          }}
                          disabled={deletando}
                          className={cn(
                            'flex items-center gap-1 text-xs transition-colors shrink-0 px-2 py-0.5 rounded-lg',
                            confirmando
                              ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                              : 'text-brand-muted hover:text-red-400 hover:bg-brand-surface'
                          )}
                        >
                          {deletando
                            ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 size={12} />
                          }
                          {confirmando && <span>Confirmar?</span>}
                        </button>
                      )}
                    </div>

                    {/* Conteúdo */}
                    {comment.conteudo && (
                      <p className="text-sm text-gray-300 leading-relaxed">
                        <TextoComMencoes texto={comment.conteudo} />
                      </p>
                    )}
                    {(comment as any).audio_url && (
                      <div className="mt-1">
                        <AudioPlayer url={(comment as any).audio_url} />
                      </div>
                    )}

                    {/* Rodapé: like do comentário */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleCurtirComentario(comment.id)}
                        className={cn(
                          'flex items-center gap-1 text-xs transition-colors',
                          comment.ja_curtiu ? 'text-red-400' : 'text-brand-muted hover:text-red-400'
                        )}
                      >
                        <motion.div animate={comment.ja_curtiu ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.25 }}>
                          <Heart size={13} className={comment.ja_curtiu ? 'fill-red-400' : ''} />
                        </motion.div>
                      </button>
                      <button
                        onClick={() => setModalLikesCommentId(comment.id)}
                        className="flex items-center gap-1 text-xs text-brand-muted hover:text-white transition-colors"
                      >
                        <Users size={12} />
                        <span>{formatarNumero(comment._count_likes ?? 0)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Modal likes do comentário */}
      {modalLikesCommentId && (
        <ModalLikesComentario
          commentId={modalLikesCommentId}
          onClose={() => setModalLikesCommentId(null)}
        />
      )}
    </div>
  )
}
