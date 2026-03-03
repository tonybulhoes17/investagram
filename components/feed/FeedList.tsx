'use client'

import { useEffect, useRef } from 'react'
import { PostCard } from './PostCard'
import { useFeed } from '@/hooks/useFeed'
import { Loader2, Users, Compass } from 'lucide-react'
import { motion } from 'framer-motion'

type Props = { userId?: string }

export function FeedList({ userId }: Props) {
  const { postsSeguindo, postsDescobrir, loading, hasMore, carregarMais, curtir, deletarPost } = useFeed(userId)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) carregarMais() },
      { threshold: 0.1 }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, carregarMais])

  // Skeleton de loading
  if (loading && postsSeguindo.length === 0 && postsDescobrir.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="card p-5 animate-pulse">
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
        ))}
      </div>
    )
  }

  const temSeguindo  = postsSeguindo.length > 0
  const temDescobrir = postsDescobrir.length > 0

  if (!temSeguindo && !temDescobrir) {
    return (
      <div className="card p-10 text-center">
        <p className="text-4xl mb-3">📈</p>
        <p className="text-white font-semibold mb-1">Nenhum post ainda</p>
        <p className="text-brand-muted text-sm">Siga investidores ou seja o primeiro a publicar!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── SEÇÃO: SEGUINDO ─────────────────────────────────── */}
      {temSeguindo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-brand-green" />
            <span className="text-xs font-semibold text-brand-green uppercase tracking-wide">
              Seguindo
            </span>
            <span className="text-xs text-brand-muted bg-brand-surface px-2 py-0.5 rounded-full">
              {postsSeguindo.length}
            </span>
            <div className="flex-1 h-px bg-brand-green/20" />
          </div>

          <div className="flex flex-col gap-4">
            {postsSeguindo.map((post) => (
              <PostCard key={post.id} post={post} onCurtir={curtir} onDeletar={deletarPost} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── SEÇÃO: DESCOBRIR ────────────────────────────────── */}
      {temDescobrir && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: temSeguindo ? 0.15 : 0 }}
        >
          {/* Separador só aparece se tiver as duas seções */}
          <div className="flex items-center gap-2 mb-3 mt-2">
            <Compass size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
              {temSeguindo ? 'Descobrir' : 'Relevantes'}
            </span>
            <span className="text-xs text-brand-muted bg-brand-surface px-2 py-0.5 rounded-full">
              {postsDescobrir.length}
            </span>
            <div className="flex-1 h-px bg-yellow-400/20" />
          </div>
          {temSeguindo && (
            <p className="text-xs text-brand-muted mb-3 -mt-1">
              Posts relevantes de investidores que você ainda não segue
            </p>
          )}

          <div className="flex flex-col gap-4">
            {postsDescobrir.map((post) => (
              <PostCard key={post.id} post={post} onCurtir={curtir} onDeletar={deletarPost} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Sentinel scroll infinito */}
      <div ref={loaderRef} className="py-4 flex justify-center">
        {loading && <Loader2 size={20} className="text-brand-muted animate-spin" />}
        {!hasMore && (postsSeguindo.length + postsDescobrir.length) > 0 && (
          <p className="text-xs text-brand-muted">Você chegou ao fim do feed 🎯</p>
        )}
      </div>
    </div>
  )
}
