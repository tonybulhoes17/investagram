'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, UserCheck, TrendingUp, TrendingDown, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { tempoRelativo, formatarNumero } from '@/lib/utils'
import { ASSET_CLASSE_LABELS } from '@/types'
import type { Profile, Post } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'

type Aba = 'usuarios' | 'posts'

type ProfileResult = Profile & {
  total_seguidores: number
  ja_sigo: boolean
}

type PostResult = Post & {
  profiles: Profile
  _count_likes: number
  _count_comments: number
}

export default function BuscaPage() {
  const router     = useRouter()
  const { user }   = useAuth()

  const [query,       setQuery]       = useState('')
  const [aba,         setAba]         = useState<Aba>('usuarios')
  const [usuarios,    setUsuarios]    = useState<ProfileResult[]>([])
  const [posts,       setPosts]       = useState<PostResult[]>([])
  const [loading,     setLoading]     = useState(false)
  const [buscou,      setBuscou]      = useState(false)

  const buscar = useCallback(async (termo: string) => {
    if (!termo.trim()) {
      setUsuarios([])
      setPosts([])
      setBuscou(false)
      return
    }

    setLoading(true)
    setBuscou(true)
    const t = termo.trim().toLowerCase()

    // Busca usuários por nome ou username
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${t}%,nome.ilike.%${t}%`)
      .neq('id', user?.id ?? '')
      .limit(20)

    // Enriquece com contagem de seguidores e flag "ja_sigo"
    const usersEnriquecidos: ProfileResult[] = await Promise.all(
      (usersData ?? []).map(async (u) => {
        const [{ count: segCount }, { count: sigoCount }] = await Promise.all([
          supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', u.id),
          user
            ? supabase.from('followers').select('*', { count: 'exact', head: true })
                .eq('follower_id', user.id).eq('following_id', u.id)
            : Promise.resolve({ count: 0 }),
        ])
        return {
          ...u,
          total_seguidores: segCount ?? 0,
          ja_sigo:          (sigoCount ?? 0) > 0,
        }
      })
    )

    // Busca posts por ativo ou conteúdo
    const { data: postsData } = await supabase
      .from('posts')
      .select(`*, profiles:user_id(id,username,nome,foto_url), likes(count), comments(count)`)
      .or(`ativo_nome.ilike.%${t}%,conteudo.ilike.%${t}%`)
      .order('score_relevancia', { ascending: false })
      .limit(20)

    const postsEnriquecidos: PostResult[] = (postsData ?? []).map((p: any) => ({
      ...p,
      _count_likes:    p.likes?.[0]?.count    ?? 0,
      _count_comments: p.comments?.[0]?.count ?? 0,
    }))

    setUsuarios(usersEnriquecidos)
    setPosts(postsEnriquecidos)
    setLoading(false)
  }, [user])

  // Debounce: espera 400ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => buscar(query), 400)
    return () => clearTimeout(timer)
  }, [query, buscar])

  const handleSeguir = async (perfil: ProfileResult) => {
    if (!user) { toast.error('Faça login para seguir'); return }

    if (perfil.ja_sigo) {
      await supabase.from('followers').delete()
        .eq('follower_id', user.id).eq('following_id', perfil.id)
      setUsuarios((prev) => prev.map((u) =>
        u.id === perfil.id
          ? { ...u, ja_sigo: false, total_seguidores: u.total_seguidores - 1 }
          : u
      ))
    } else {
      await supabase.from('followers').insert({
        follower_id:  user.id,
        following_id: perfil.id,
      })
      setUsuarios((prev) => prev.map((u) =>
        u.id === perfil.id
          ? { ...u, ja_sigo: true, total_seguidores: u.total_seguidores + 1 }
          : u
      ))
      toast.success(`Seguindo @${perfil.username}!`)
    }
  }

  const temResultados = usuarios.length > 0 || posts.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Campo de busca */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar investidores, ativos, teses..."
          autoFocus
          className="input pl-11 pr-10 py-3.5 text-base"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Estado inicial — sugestões */}
      {!buscou && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-brand-muted" />
          </div>
          <p className="text-white font-semibold mb-2">Encontre investidores</p>
          <p className="text-brand-muted text-sm">
            Busque por nome, @username, ativo ou tese
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {['Bitcoin', 'PETR4', 'dividendos', 'longo prazo', 'ETF'].map((sugestao) => (
              <button
                key={sugestao}
                onClick={() => setQuery(sugestao)}
                className="text-xs bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green px-3 py-1.5 rounded-full transition-colors"
              >
                {sugestao}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((n) => (
            <div key={n} className="card p-4 animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-surface shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-brand-surface rounded w-32 mb-2" />
                <div className="h-2 bg-brand-surface rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sem resultados */}
      {buscou && !loading && !temResultados && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white font-semibold mb-1">Nenhum resultado para "{query}"</p>
          <p className="text-brand-muted text-sm">Tente buscar por outro nome ou ativo</p>
        </div>
      )}

      {/* Resultados */}
      {buscou && !loading && temResultados && (
        <div>
          {/* Abas */}
          <div className="flex gap-1 mb-4 bg-brand-card border border-brand-border rounded-xl p-1">
            <button
              onClick={() => setAba('usuarios')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                aba === 'usuarios'
                  ? 'bg-brand-green text-brand-dark'
                  : 'text-brand-muted hover:text-white'
              }`}
            >
              Investidores
              {usuarios.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  aba === 'usuarios' ? 'bg-brand-dark/30' : 'bg-brand-surface'
                }`}>
                  {usuarios.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setAba('posts')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                aba === 'posts'
                  ? 'bg-brand-green text-brand-dark'
                  : 'text-brand-muted hover:text-white'
              }`}
            >
              Posts
              {posts.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  aba === 'posts' ? 'bg-brand-dark/30' : 'bg-brand-surface'
                }`}>
                  {posts.length}
                </span>
              )}
            </button>
          </div>

          {/* ── USUÁRIOS ── */}
          <AnimatePresence mode="wait">
            {aba === 'usuarios' && (
              <motion.div
                key="usuarios"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {usuarios.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-brand-muted text-sm">Nenhum investidor encontrado</p>
                  </div>
                ) : (
                  usuarios.map((perfil) => (
                    <motion.div
                      key={perfil.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-4 flex items-center gap-3"
                    >
                      {/* Avatar clicável */}
                      <Link href={`/main/perfil/${perfil.id}`} className="shrink-0">
                        <div className="w-12 h-12 rounded-full bg-brand-surface border border-brand-border overflow-hidden hover:border-brand-green transition-colors">
                          {perfil.foto_url ? (
                            <img src={perfil.foto_url} alt={perfil.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-brand-muted">
                              {perfil.nome[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <Link href={`/main/perfil/${perfil.id}`} className="flex-1 min-w-0 group">
                        <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors truncate">
                          {perfil.nome}
                        </p>
                        <p className="text-xs text-brand-muted">@{perfil.username}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-brand-muted">
                            {formatarNumero(perfil.total_seguidores)} seguidores
                          </span>
                          {perfil.pais && (
                            <span className="text-xs text-brand-muted">🌎 {perfil.pais}</span>
                          )}
                        </div>
                        {perfil.bio && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{perfil.bio}</p>
                        )}
                      </Link>

                      {/* Botão seguir */}
                      <button
                        onClick={() => handleSeguir(perfil)}
                        className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                          perfil.ja_sigo
                            ? 'border-brand-border text-brand-muted hover:border-red-400 hover:text-red-400'
                            : 'border-brand-green bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-brand-dark'
                        }`}
                      >
                        {perfil.ja_sigo
                          ? <><UserCheck size={12} /> Seguindo</>
                          : <><UserPlus size={12} /> Seguir</>
                        }
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* ── POSTS ── */}
            {aba === 'posts' && (
              <motion.div
                key="posts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {posts.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-brand-muted text-sm">Nenhum post encontrado</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <Link key={post.id} href={`/main/post/${post.id}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-4 hover:border-brand-green/30 transition-colors cursor-pointer"
                      >
                        {/* Autor */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                              {post.profiles?.foto_url ? (
                                <img src={post.profiles.foto_url} alt={post.profiles.nome} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-muted">
                                  {post.profiles?.nome?.[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-brand-muted">
                              @{post.profiles?.username} · {tempoRelativo(post.created_at)}
                            </span>
                          </div>

                          {post.tipo === 'movimentacao' ? (
                            post.subtipo === 'compra'
                              ? <span className="badge-compra flex items-center gap-1"><TrendingUp size={9} /> COMPRA</span>
                              : <span className="badge-venda flex items-center gap-1"><TrendingDown size={9} /> VENDA</span>
                          ) : (
                            <span className="badge-tese">💡 TESE</span>
                          )}
                        </div>

                        {/* Ativo */}
                        {post.ativo_nome && (
                          <p className="text-sm font-semibold text-white mb-1">{post.ativo_nome}
                            {post.ativo_classe && (
                              <span className="text-xs text-brand-muted font-normal ml-2">
                                {ASSET_CLASSE_LABELS[post.ativo_classe as keyof typeof ASSET_CLASSE_LABELS]}
                              </span>
                            )}
                          </p>
                        )}

                        {/* Conteúdo */}
                        {post.conteudo && (
                          <p className="text-xs text-gray-400 line-clamp-2 mb-2">{post.conteudo}</p>
                        )}

                        {/* Contadores */}
                        <div className="flex items-center gap-3 text-xs text-brand-muted">
                          <span>❤️ {formatarNumero(post._count_likes)}</span>
                          <span>💬 {formatarNumero(post._count_comments)}</span>
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
