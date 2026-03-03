'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { PostCard } from './PostCard'
import { useAuth } from '@/hooks/useAuth'
import type { FeedItem } from '@/types'
import { Loader2 } from 'lucide-react'

type Props = {
  profileUserId: string
  tipo?: 'movimentacao' | 'tese'
}

export function PerfilFeedList({ profileUserId, tipo }: Props) {
  const { user } = useAuth()
  const [posts,   setPosts]   = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page,    setPage]    = useState(0)
  const loaderRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 10

  const buscar = async (pagina: number, acumular = false) => {
    setLoading(true)
    const offset = pagina * PAGE_SIZE

    // Monta a query com filtro opcional de tipo
    let query = supabase
      .from('posts')
      .select(`*, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false })

    if (tipo) query = (query as any).eq('tipo', tipo)

    const { data } = await (query as any).range(offset, offset + PAGE_SIZE - 1)

    const enriquecidos: FeedItem[] = await Promise.all(
      (data ?? []).map(async (post: any) => {
        let ja_curtiu = false
        if (user) {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
            .eq('user_id', user.id)
          ja_curtiu = (count ?? 0) > 0
        }
        return {
          ...post,
          _count_likes:    post.likes?.[0]?.count    ?? 0,
          _count_comments: post.comments?.[0]?.count ?? 0,
          ja_curtiu,
        }
      })
    )

    if (acumular) setPosts((prev) => [...prev, ...enriquecidos])
    else          setPosts(enriquecidos)

    setHasMore(enriquecidos.length === PAGE_SIZE)
    setLoading(false)
  }

  useEffect(() => {
    setPage(0)
    setPosts([])
    buscar(0, false)
  }, [profileUserId, tipo])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const p = page + 1
          setPage(p)
          buscar(p, true)
        }
      },
      { threshold: 0.1 }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, page])

  const curtir = async (postId: string) => {
    if (!user) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    if (post.ja_curtiu) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
    }
    setPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      ja_curtiu:    !p.ja_curtiu,
      _count_likes: p.ja_curtiu ? p._count_likes - 1 : p._count_likes + 1,
    }))
  }

  const deletar = (postId: string) => setPosts((prev) => prev.filter((p) => p.id !== postId))

  // Skeleton
  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {[1,2,3].map((n) => (
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

  if (posts.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-4xl mb-3">{tipo === 'tese' ? '💡' : '📭'}</p>
        <p className="text-white font-semibold mb-1">
          {tipo === 'tese' ? 'Nenhuma tese publicada' : 'Nenhum post ainda'}
        </p>
        <p className="text-brand-muted text-sm">
          {tipo === 'tese'
            ? 'Este investidor ainda não compartilhou teses de investimento.'
            : 'Este investidor ainda não publicou nada.'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onCurtir={curtir} onDeletar={deletar} />
      ))}
      <div ref={loaderRef} className="py-4 flex justify-center">
        {loading && <Loader2 size={20} className="text-brand-muted animate-spin" />}
        {!hasMore && posts.length > 0 && (
          <p className="text-xs text-brand-muted">Todos os posts carregados ✓</p>
        )}
      </div>
    </div>
  )
}
