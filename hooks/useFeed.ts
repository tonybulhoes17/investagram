'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FeedItem } from '@/types'

const PAGE_SIZE = 10

export type UltimoComentario = {
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

async function enriquecerPosts(posts: any[], userId?: string): Promise<FeedItem[]> {
  return Promise.all(
    posts.map(async (post) => {
      // Curtida do usuário atual
      let ja_curtiu = false
      if (userId) {
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('user_id', userId)
        ja_curtiu = (count ?? 0) > 0
      }

      // Último comentário com perfil do autor
      const { data: ultimoComentarioData } = await supabase
        .from('comments')
        .select('id, conteudo, created_at, profiles:user_id(id, nome, username, foto_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const ultimo_comentario: UltimoComentario | null = ultimoComentarioData
        ? {
            id:         ultimoComentarioData.id,
            conteudo:   ultimoComentarioData.conteudo,
            created_at: ultimoComentarioData.created_at,
            autor:      ultimoComentarioData.profiles as any,
          }
        : null

      return {
        ...post,
        _count_likes:      post.likes?.[0]?.count    ?? 0,
        _count_comments:   post.comments?.[0]?.count ?? 0,
        ja_curtiu,
        ultimo_comentario,
      }
    })
  )
}

// Ordena posts: os com comentário mais recente sobem (mistura com created_at)
function ordenarPorAtividade(posts: FeedItem[]): FeedItem[] {
  return [...posts].sort((a, b) => {
    const aAtivo = (a as any).ultimo_comentario?.created_at ?? a.created_at
    const bAtivo = (b as any).ultimo_comentario?.created_at ?? b.created_at
    return new Date(bAtivo).getTime() - new Date(aAtivo).getTime()
  })
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

    // 2. Posts de quem segue
    let seguindoPosts: FeedItem[] = []
    if (idsSeguindo.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`*, audio_url, imagem_url, imagens_urls, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
        .in('user_id', idsSeguindo)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      seguindoPosts = ordenarPorAtividade(await enriquecerPosts(data ?? [], userId))
    }

    // 3. Posts Descobrir (quem não segue)
    const excluir = userId ? [...idsSeguindo, userId] : idsSeguindo

    let descobrirPosts: FeedItem[] = []
    if (excluir.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`*, audio_url, imagem_url, imagens_urls, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
        .not('user_id', 'in', `(${excluir.join(',')})`)
        .order('score_relevancia', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      descobrirPosts = ordenarPorAtividade(await enriquecerPosts(data ?? [], userId))
    } else {
      const { data } = await supabase
        .from('posts')
        .select(`*, audio_url, imagem_url, imagens_urls, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
        .order('score_relevancia', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      descobrirPosts = ordenarPorAtividade(await enriquecerPosts(data ?? [], userId))
    }

    if (acumular) {
      setPostsSeguindo((prev)  => ordenarPorAtividade([...prev, ...seguindoPosts]))
      setPostsDescobrir((prev) => ordenarPorAtividade([...prev, ...descobrirPosts]))
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

  // Realtime: novo comentário → atualiza último comentário e sobe o post no feed
  useEffect(() => {
    const channel = supabase
      .channel('feed-comentarios')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, async (payload) => {
        const novoComentario = payload.new as any
        const postId = novoComentario.post_id

        // Busca perfil do autor do comentário
        const { data: perfil } = await supabase
          .from('profiles')
          .select('id, nome, username, foto_url')
          .eq('id', novoComentario.user_id)
          .single()

        const ultimoComentario: UltimoComentario = {
          id:         novoComentario.id,
          conteudo:   novoComentario.conteudo,
          created_at: novoComentario.created_at,
          autor:      perfil as any,
        }

        const atualizarLista = (prev: FeedItem[]) => {
          const postIdx = prev.findIndex((p) => p.id === postId)
          if (postIdx === -1) return prev
          const atualizado = {
            ...prev[postIdx],
            _count_comments:  (prev[postIdx]._count_comments ?? 0) + 1,
            ultimo_comentario: ultimoComentario,
          } as FeedItem
          // Remove e reinsere no topo (subiu por atividade)
          const nova = [...prev]
          nova.splice(postIdx, 1)
          return [atualizado, ...nova]
        }

        setPostsSeguindo(atualizarLista)
        setPostsDescobrir(atualizarLista)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

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

  const carregarMais = () => {
    if (!hasMore || loading) return
    const proxima = page + 1
    setPage(proxima)
    buscarFeed(proxima, true)
  }

  return { postsSeguindo, postsDescobrir, loading, hasMore, carregarMais, curtir, deletarPost }
}
