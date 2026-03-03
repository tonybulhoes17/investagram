'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MapPin, Calendar, Users, UserPlus, UserCheck, Edit3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PerfilFeedList } from '@/components/feed/PerfilFeedList'
import { CarteiraChart } from '@/components/carteira/PieChart'
import { formatarNumero } from '@/lib/utils'
import type { Profile, PortfolioAsset, AssetClasse } from '@/types'
import { ASSET_CLASSE_COLORS, ASSET_CLASSE_LABELS } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { criarNotificacao } from '@/lib/notificacoes'

type Aba = 'posts' | 'teses' | 'carteira'

export default function PerfilPage() {
  const params   = useParams()
  const userId   = params.id as string
  const { user } = useAuth()
  const router = useRouter()
  const [perfil,        setPerfil]        = useState<Profile | null>(null)
  const [abaAtiva,      setAbaAtiva]      = useState<Aba>('posts')
  const [jaSigo,        setJaSigo]        = useState(false)
  const [seguidores,    setSeguidores]    = useState(0)
  const [seguindo,      setSeguindo]      = useState(0)
  const [totalPosts,    setTotalPosts]    = useState(0)
  const [carteira,      setCarteira]      = useState<PortfolioAsset[]>([])
  const [carregando,    setCarregando]    = useState(true)

  const ehMeuPerfil = user?.id === userId

  useEffect(() => {
    if (userId) carregarPerfil()
  }, [userId, user])

  const carregarPerfil = async () => {
    setCarregando(true)

    const [
      { data: perfilData },
      { count: segCount },
      { count: seguCount },
      { count: postsCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    setPerfil(perfilData)
    setSeguidores(segCount ?? 0)
    setSeguindo(seguCount ?? 0)
    setTotalPosts(postsCount ?? 0)

    // Verifica se o usuário logado segue este perfil
    if (user && !ehMeuPerfil) {
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('following_id', userId)
      setJaSigo((count ?? 0) > 0)
    }

    // Carrega carteira
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('*, portfolio_assets(*)')
      .eq('user_id', userId)
      .single()

    if (portfolio?.portfolio_assets) {
      setCarteira(portfolio.portfolio_assets)
    }

    setCarregando(false)
  }

  const handleSeguir = async () => {
    if (!user) { toast.error('Faça login para seguir'); return }

    if (jaSigo) {
      await supabase.from('followers').delete()
        .eq('follower_id', user.id).eq('following_id', userId)
      setJaSigo(false)
      setSeguidores((s) => s - 1)
    } else {
      await supabase.from('followers').insert({
        follower_id:  user.id,
        following_id: userId,
      })
      setJaSigo(true)
      setSeguidores((s) => s + 1)
      toast.success(`Seguindo @${perfil?.username}!`)
      await criarNotificacao({ userId, actorId: user.id, tipo: 'seguiu' })
    }
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-10 animate-pulse">
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-brand-surface" />
            <div className="flex-1">
              <div className="h-4 bg-brand-surface rounded w-40 mb-2" />
              <div className="h-3 bg-brand-surface rounded w-24" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-10 text-center">
          <p className="text-brand-muted">Usuário não encontrado</p>
        </div>
      </div>
    )
  }

  const abas: { id: Aba; label: string }[] = [
    { id: 'posts',    label: 'Movimentações' },
    { id: 'teses',    label: 'Teses'         },
    { id: 'carteira', label: 'Carteira'      },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header do perfil */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-4"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-brand-surface border-2 border-brand-border overflow-hidden shrink-0">
            {perfil.foto_url ? (
              <img src={perfil.foto_url} alt={perfil.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-brand-muted">
                {perfil.nome[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold text-white truncate">{perfil.nome}</h1>
                <p className="text-brand-muted text-sm">@{perfil.username}</p>
              </div>

              {/* Botão seguir / editar */}
              {ehMeuPerfil ? (
                <button
                  onClick={() => router.push('/main/editar')}
                  className="btn-outline flex items-center gap-1.5 text-sm py-1.5 px-3"
                >
                  <Edit3 size={13} />
                  Editar
                </button>
              ) : (
                <button
                  onClick={handleSeguir}
                  className={`flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-xl border font-medium transition-all ${
                    jaSigo
                      ? 'border-brand-border text-brand-muted hover:border-red-400 hover:text-red-400'
                      : 'border-brand-green bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-brand-dark'
                  }`}
                >
                  {jaSigo ? <><UserCheck size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}
                </button>
              )}
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 mt-2">
              {perfil.pais && (
                <span className="flex items-center gap-1 text-xs text-brand-muted">
                  <MapPin size={11} /> {perfil.pais}
                </span>
              )}
              {perfil.idade && (
                <span className="flex items-center gap-1 text-xs text-brand-muted">
                  <Calendar size={11} /> {perfil.idade} anos
                </span>
              )}
            </div>

            {/* Bio */}
            {perfil.bio && (
              <p className="text-sm text-gray-300 mt-2 leading-relaxed">{perfil.bio}</p>
            )}
          </div>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-brand-border">
          {[
            { label: 'Posts',      valor: totalPosts,  href: null                                   },
            { label: 'Seguidores', valor: seguidores,  href: `/main/perfil/${userId}/seguidores`    },
            { label: 'Seguindo',   valor: seguindo,    href: `/main/perfil/${userId}/seguindo`      },
          ].map(({ label, valor, href }) => (
            <div key={label} className="text-center">
              {href ? (
                <Link href={href} className="group block">
                  <p className="text-xl font-bold text-white group-hover:text-brand-green transition-colors">
                    {formatarNumero(valor)}
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5 group-hover:text-brand-green transition-colors">
                    {label}
                  </p>
                </Link>
              ) : (
                <>
                  <p className="text-xl font-bold text-white">{formatarNumero(valor)}</p>
                  <p className="text-xs text-brand-muted mt-0.5">{label}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-brand-card rounded-xl p-1 border border-brand-border">
        {abas.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setAbaAtiva(id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              abaAtiva === id
                ? 'bg-brand-green text-brand-dark'
                : 'text-brand-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'posts' && (
        <PerfilFeedList profileUserId={userId} tipo="movimentacao" />
      )}

      {abaAtiva === 'teses' && (
        <PerfilFeedList profileUserId={userId} tipo="tese" />
      )}

      {abaAtiva === 'carteira' && (
        <div className="space-y-4">
          {carteira.length > 0 ? (
            <>
              {/* Gráfico */}
              <div className="card p-6">
                <p className="text-sm text-brand-muted mb-4">Distribuição proporcional da carteira</p>
                <CarteiraChart
                  assets={carteira.map((a) => ({
                    classe:     a.classe as AssetClasse,
                    nome:       a.nome,
                    percentual: a.percentual,
                  }))}
                />
              </div>

              {/* Lista de ativos */}
              <div className="card p-5">
                <p className="text-sm font-semibold text-white mb-4">
                  Composição da carteira
                  <span className="text-brand-muted font-normal text-xs ml-2">
                    ({carteira.length} ativo{carteira.length !== 1 ? 's' : ''})
                  </span>
                </p>
                <div className="space-y-2">
                  {[...carteira]
                    .sort((a, b) => b.percentual - a.percentual)
                    .map((ativo) => (
                      <div key={ativo.id} className="flex items-center gap-3 py-2 border-b border-brand-border/40 last:border-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: ASSET_CLASSE_COLORS[ativo.classe as AssetClasse] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium truncate">{ativo.nome}</span>
                            {ativo.ticker && (
                              <span className="text-xs text-brand-muted bg-brand-surface px-1.5 py-0.5 rounded shrink-0">
                                {ativo.ticker}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-brand-muted">
                            {ASSET_CLASSE_LABELS[ativo.classe as AssetClasse]}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-brand-green">{ativo.percentual.toFixed(1)}%</p>
                          {/* Barra de proporção */}
                          <div className="w-16 h-1 bg-brand-surface rounded-full mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ativo.percentual}%`,
                                backgroundColor: ASSET_CLASSE_COLORS[ativo.classe as AssetClasse]
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-brand-muted text-sm">
                {ehMeuPerfil ? 'Configure sua carteira na aba Carteira.' : 'Este usuário ainda não configurou a carteira.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
