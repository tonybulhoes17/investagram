'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, MoreVertical, Pencil, Trash2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { tempoRelativo, formatarNumero, cn } from '@/lib/utils'
import { ASSET_CLASSE_LABELS } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { criarNotificacao } from '@/lib/notificacoes'
import type { FeedItem } from '@/types'
import { AudioPlayer } from '@/components/AudioRecorder'
import toast from 'react-hot-toast'

type Props = {
  post:      FeedItem
  onCurtir:  (postId: string) => void
  onDeletar?: (postId: string) => void
}

type CurtidaProfile = {
  id:       string
  nome:     string
  username: string
  foto_url: string | null
}

type UltimoComentario = {
  id:         string
  conteudo:   string
  created_at: string
  autor: {
    id:       string
    nome:     string
    username: string
    foto_url: string | null
  }
}

// ── Helper: extrai array de URLs de imagens ──────────────────
function getImagensUrls(post: any): string[] {
  // Prioriza o novo campo array; cai no legado imagem_url se necessário
  if (Array.isArray(post.imagens_urls) && post.imagens_urls.length > 0) {
    return post.imagens_urls
  }
  if (typeof post.imagem_url === 'string' && post.imagem_url) {
    return [post.imagem_url]
  }
  return []
}

// ── Carrossel de imagens no card (swipe estilo Instagram) ────
function CarrosselImagens({ urls, onClickFoto }: { urls: string[]; onClickFoto: (index: number) => void }) {
  const [indice,    setIndice]    = useState(0)
  const [arrastou,  setArrastou]  = useState(false)   // distingue click de drag
  const containerRef              = useRef<HTMLDivElement>(null)

  const ir = useCallback((i: number) => {
    setIndice(Math.max(0, Math.min(i, urls.length - 1)))
  }, [urls.length])

  if (urls.length === 0) return null

  // Uma única imagem — comportamento simples
  if (urls.length === 1) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-4 rounded-xl overflow-hidden border border-brand-border/50 cursor-pointer"
        onClick={() => onClickFoto(0)}
      >
        <img src={urls[0]} alt="Imagem do post" className="w-full max-h-96 object-cover hover:opacity-95 transition-opacity" />
      </motion.div>
    )
  }

  const largura = containerRef.current?.offsetWidth ?? 0

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-4 relative rounded-xl overflow-hidden border border-brand-border/50 select-none"
      style={{ touchAction: 'pan-y' }}   // permite scroll vertical, captura horizontal
    >
      {/* Trilho deslizante */}
      <motion.div
        className="flex"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        onDragStart={() => setArrastou(false)}
        onDrag={(_, info) => {
          // considera "arrastou" se movimento horizontal > 5px
          if (Math.abs(info.offset.x) > 5) setArrastou(true)
        }}
        onDragEnd={(_, info) => {
          const threshold = largura * 0.2   // 20% da largura para trocar
          if (info.offset.x < -threshold && indice < urls.length - 1) ir(indice + 1)
          else if (info.offset.x > threshold && indice > 0) ir(indice - 1)
        }}
        animate={{ x: -(indice * (largura || 100)) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ width: `${urls.length * 100}%` }}
      >
        {urls.map((url, i) => (
          <div
            key={url}
            style={{ width: `${100 / urls.length}%` }}
            onClick={() => { if (!arrastou) onClickFoto(i) }}
            className="cursor-pointer"
          >
            <img
              src={url}
              alt={`Foto ${i + 1} de ${urls.length}`}
              className="w-full max-h-96 object-cover pointer-events-none"
              draggable={false}
            />
          </div>
        ))}
      </motion.div>

      {/* Dots estilo Instagram */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
        {urls.map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-300',
              i === indice
                ? 'w-4 h-1.5 bg-white'
                : 'w-1.5 h-1.5 bg-white/50'
            )}
          />
        ))}
      </div>

      {/* Badge contador */}
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white font-medium pointer-events-none">
        {indice + 1}/{urls.length}
      </div>
    </motion.div>
  )
}

// ── Modal de imagem em tela cheia com carrossel ──────────────
function ModalImagem({ urls, indiceInicial, onClose }: { urls: string[]; indiceInicial: number; onClose: () => void }) {
  const [indice, setIndice] = useState(indiceInicial)

  const anterior = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndice(i => (i - 1 + urls.length) % urls.length)
  }, [urls.length])

  const proximo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndice(i => (i + 1) % urls.length)
  }, [urls.length])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X size={20} />
      </button>

      {/* Contador */}
      {urls.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white z-10">
          {indice + 1} / {urls.length}
        </div>
      )}

      {/* Imagem */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={indice}
          src={urls[indice]}
          alt={`Foto ${indice + 1}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1   }}
          exit={{   opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </AnimatePresence>

      {/* Navegação */}
      {urls.length > 1 && (
        <>
          <button
            onClick={anterior}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={proximo}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronRight size={22} />
          </button>

          {/* Miniaturas na parte inferior */}
          <div
            className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {urls.map((url, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIndice(i) }}
                className={cn(
                  'w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                  i === indice ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-90'
                )}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}

// ── Modal de quem curtiu ─────────────────────────────────────
function ModalCurtidas({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [perfis,  setPerfis]  = useState<CurtidaProfile[]>([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    supabase
      .from('likes')
      .select('user_id, profiles:user_id(id, nome, username, foto_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPerfis((data ?? []).map((d: any) => d.profiles).filter(Boolean))
        setLoading(false)
      })
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-red-400 fill-red-400" />
              <h2 className="text-white font-semibold">Curtidas</h2>
              {!loading && (
                <span className="text-xs text-brand-muted bg-brand-surface px-2 py-0.5 rounded-full">{perfis.length}</span>
              )}
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


// ── Último comentário em destaque ────────────────────────────
function UltimoComentarioCard({ comentario, postId }: { comentario: UltimoComentario; postId: string }) {
  const MAX = 120
  const [expandido, setExpandido] = useState(false)
  const longo = comentario.conteudo.length > MAX
  const texto = expandido || !longo ? comentario.conteudo : comentario.conteudo.slice(0, MAX) + '…'

  return (
    <Link href={`/main/post/${postId}`} className="block group">
      <div className="mt-3 px-3 py-2.5 bg-brand-surface/60 border border-brand-border/40 rounded-xl hover:border-brand-green/20 transition-colors">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
            {comentario.autor?.foto_url
              ? <img src={comentario.autor.foto_url} alt={comentario.autor.nome} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-brand-muted">{comentario.autor?.nome?.[0]?.toUpperCase() ?? '?'}</div>
            }
          </div>
          <span className="text-xs font-semibold text-white/80 group-hover:text-brand-green transition-colors truncate">
            {comentario.autor?.nome ?? 'Usuário'}
          </span>
          <span className="text-[10px] text-brand-muted ml-auto shrink-0">
            {tempoRelativo(comentario.created_at)}
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          {texto}
          {longo && !expandido && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandido(true) }}
              className="text-brand-green hover:underline ml-1"
            >
              ver mais
            </button>
          )}
        </p>
      </div>
    </Link>
  )
}


// ── PostCard principal ───────────────────────────────────────
export function PostCard({ post, onCurtir, onDeletar }: Props) {
  const router = useRouter()
  const { user } = useAuth()

  const [expandido,       setExpandido]       = useState(false)
  const [copiado,         setCopiado]         = useState(false)
  const [menuAberto,      setMenuAberto]      = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deletando,       setDeletando]       = useState(false)
  const [modalCurtidas,   setModalCurtidas]   = useState(false)
  const [modalImagemIdx,  setModalImagemIdx]  = useState<number | null>(null)

  const autor       = post.profiles
  const temConteudo = (post.conteudo?.length ?? 0) > 200
  const ehMeuPost   = user?.id === post.user_id
  const imagens     = getImagensUrls(post)

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
    <>
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
              {autor?.foto_url
                ? <img src={autor.foto_url} alt={autor.nome} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-brand-muted font-bold">{autor?.nome?.[0]?.toUpperCase() ?? '?'}</div>
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors">{autor?.nome ?? 'Usuário'}</p>
              <p className="text-xs text-brand-muted">@{autor?.username} · {tempoRelativo(post.created_at)}</p>
            </div>
          </Link>

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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                    animate={{ opacity: 1, scale: 1,   y: 0  }}
                    exit={{   opacity: 0, scale: 0.9, y: -5  }}
                    className="absolute right-0 top-8 z-20 bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden min-w-[130px]"
                  >
                    <button onClick={handleEditar} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-brand-surface transition-colors">
                      <Pencil size={13} /> Editar
                    </button>
                    <button onClick={handleDeletar} className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors', confirmDelete ? 'text-red-400 bg-red-500/10' : 'text-brand-muted hover:bg-brand-surface hover:text-red-400')}>
                      <Trash2 size={13} /> {confirmDelete ? 'Confirmar?' : 'Deletar'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Tipo do post */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', post.tipo === 'movimentacao' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20')}>
            {post.tipo === 'movimentacao' ? '📊 Movimentação' : '💡 Tese de Investimento'}
          </span>
          {post.subtipo && (
            <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border', post.subtipo === 'compra' ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
              {post.subtipo === 'compra' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {post.subtipo === 'compra' ? 'Compra' : 'Venda'}
            </span>
          )}
        </div>

        {/* Ativo */}
        {post.ativo_nome && (
          <div className="bg-brand-surface rounded-xl p-3 mb-3 border border-brand-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-brand-muted mb-0.5">Ativo</p>
                <p className="text-white font-semibold">{post.ativo_nome}</p>
              </div>
              <div className="text-right">
                {post.ativo_classe && (
                  <span className="text-xs text-brand-muted bg-brand-card px-2 py-0.5 rounded-lg border border-brand-border">
                    {String(ASSET_CLASSE_LABELS[post.ativo_classe as keyof typeof ASSET_CLASSE_LABELS] ?? post.ativo_classe)}
                  </span>
                )}
                {post.data_operacao && (
                  <p className="text-xs text-brand-muted mt-1">
                    {new Date(post.data_operacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {post.conteudo && (
          <div className="mb-4">
            <p className={cn('text-sm text-gray-300 leading-relaxed', !expandido && temConteudo && 'line-clamp-3')}>
              {post.conteudo}
            </p>
            {temConteudo && (
              <button onClick={() => setExpandido(!expandido)} className="flex items-center gap-1 text-xs text-brand-green hover:underline mt-1">
                {expandido ? <><ChevronUp size={12} /> Mostrar menos</> : <><ChevronDown size={12} /> Ler mais</>}
              </button>
            )}
          </div>
        )}

        {/* Carrossel de imagens */}
        {imagens.length > 0 && (
          <CarrosselImagens
            urls={imagens}
            onClickFoto={(idx) => setModalImagemIdx(idx)}
          />
        )}

        {/* Áudio do post */}
        {(post as any).audio_url && (
          <AudioPlayer url={(post as any).audio_url} />
        )}

        {/* Último comentário */}
        {(post as any).ultimo_comentario && (
          <UltimoComentarioCard
            comentario={(post as any).ultimo_comentario as UltimoComentario}
            postId={post.id}
          />
        )}

        {/* Rodapé: ações */}
        <div className="flex items-center gap-4 pt-3 mt-3 border-t border-brand-border/50">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                onCurtir(post.id)
                if (!post.ja_curtiu && user && post.user_id !== user.id) {
                  await criarNotificacao({ userId: post.user_id, actorId: user.id, tipo: 'curtida', postId: post.id })
                }
              }}
              className={cn('flex items-center gap-1.5 text-sm transition-colors', post.ja_curtiu ? 'text-red-400' : 'text-brand-muted hover:text-red-400')}
            >
              <motion.div animate={post.ja_curtiu ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
                <Heart size={17} className={post.ja_curtiu ? 'fill-red-400' : ''} />
              </motion.div>
            </button>
            <button onClick={() => setModalCurtidas(true)} className="flex items-center gap-1 text-sm text-brand-muted hover:text-white transition-colors">
              <Users size={14} />
              <span>{formatarNumero(post._count_likes)}</span>
            </button>
          </div>

          <Link href={`/main/post/${post.id}`} className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition-colors">
            <MessageCircle size={17} />
            <span>{formatarNumero(post._count_comments)}</span>
          </Link>

          <button onClick={handleCompartilhar} className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-green transition-colors ml-auto">
            <Share2 size={15} />
            <span className="text-xs">{copiado ? 'Copiado!' : 'Compartilhar'}</span>
          </button>
        </div>
      </motion.div>

      {modalCurtidas && <ModalCurtidas postId={post.id} onClose={() => setModalCurtidas(false)} />}

      <AnimatePresence>
        {modalImagemIdx !== null && imagens.length > 0 && (
          <ModalImagem
            urls={imagens}
            indiceInicial={modalImagemIdx}
            onClose={() => setModalImagemIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
