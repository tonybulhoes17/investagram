'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FeedItem } from '@/types'

const PAGE_SIZE = 10

async function enriquecerPosts(posts: any[], userId?: string): Promise<FeedItem[]> {
  return Promise.all(
    posts.map(async (post) => {
      let ja_curtiu = false
      if (userId) {
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('user_id', userId)
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
}

export function useFeed(userId?: string) {
  const [postsSeguindo,  setPostsSeguindo]  = useState<FeedItem[]>([])
  const [postsDescobrir, setPostsDescobrir] = useState<FeedItem[]>([])
  const [loading,        setLoading]        = useState(true)
  const [hasMore,        setHasMore]        = useState(true)
  const [page,           setPage]           = useState(0)

  const buscarFeed = useCallback(async (pagina: number, acumular = false) => {
    setLoading(true)
    const offset = pagina * PAGE_SIZE

    // 1. IDs de quem o usuário segue
    let idsSeguindo: string[] = []
    if (userId) {
      const { data: seguindo } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId)
      idsSeguindo = seguindo?.map((s) => s.following_id) ?? []
    }

    // 2. Posts de quem segue + próprios posts (usuário "segue a si mesmo")
    const idsSeguindoComProprio = userId ? [...idsSeguindo, userId] : idsSeguindo
    let seguindoPosts: FeedItem[] = []
    if (idsSeguindoComProprio.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`*, audio_url, imagem_url, imagens_urls, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
        .in('user_id', idsSeguindoComProprio)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      seguindoPosts = await enriquecerPosts(data ?? [], userId)
    }

    // 3. Posts relevantes de quem NÃO segue (Descobrir)
    // Exclui próprio usuário e quem já segue
    const excluir = idsSeguindoComProprio

    let descobrirPosts: FeedItem[] = []
    if (excluir.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`*, audio_url, imagem_url, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
        .not('user_id', 'in', `(${excluir.join(',')})`)
        .order('score_relevancia', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      descobrirPosts = await enriquecerPosts(data ?? [], userId)
    } else {
      // Sem seguidos: mostra tudo como descobrir
      const { data } = await supabase
        .from('posts')
        .select(`*, audio_url, imagem_url, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
        .order('score_relevancia', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      descobrirPosts = await enriquecerPosts(data ?? [], userId)
    }

    if (acumular) {
      setPostsSeguindo((prev)  => [...prev, ...seguindoPosts])
      setPostsDescobrir((prev) => [...prev, ...descobrirPosts])
    } else {
      setPostsSeguindo(seguindoPosts)
      setPostsDescobrir(descobrirPosts)
    }

    setHasMore((seguindoPosts.length + descobrirPosts.length) >= PAGE_SIZE)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    setPage(0)
    buscarFeed(0, false)
  }, [buscarFeed])

  const carregarMais = () => {
    if (!hasMore || loading) return
    const proxima = page + 1
    setPage(proxima)
    buscarFeed(proxima, true)
  }

  const curtir = async (postId: string) => {
    if (!userId) return
    const post = [...postsSeguindo, ...postsDescobrir].find((p) => p.id === postId)
    if (!post) return

    if (post.ja_curtiu) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
    }

    const atualizar = (prev: FeedItem[]) =>
      prev.map((p) => p.id !== postId ? p : {
        ...p,
        ja_curtiu:    !p.ja_curtiu,
        _count_likes: p.ja_curtiu ? p._count_likes - 1 : p._count_likes + 1,
      })

    setPostsSeguindo(atualizar)
    setPostsDescobrir(atualizar)
  }

  const deletarPost = (postId: string) => {
    setPostsSeguindo((prev)  => prev.filter((p) => p.id !== postId))
    setPostsDescobrir((prev) => prev.filter((p) => p.id !== postId))
  }

  return { postsSeguindo, postsDescobrir, loading, hasMore, carregarMais, curtir, deletarPost }
}