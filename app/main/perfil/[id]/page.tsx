'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MapPin, Calendar, UserPlus, UserCheck, Edit3, Star, Send, Trash2, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { PerfilFeedList } from '@/components/feed/PerfilFeedList'
import { CarteiraChart } from '@/components/carteira/PieChart'
import { formatarNumero, tempoRelativo } from '@/lib/utils'
import type { Profile, PortfolioAsset, AssetClasse } from '@/types'
import { ASSET_CLASSE_COLORS, ASSET_CLASSE_LABELS } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { criarNotificacao } from '@/lib/notificacoes'
import { EnquetesEncerradas } from '@/components/enquetes/EnquetesEncerradas'

type Avaliacao = {
  id:           string
  portfolio_id: string
  user_id:      string
  nota:         number
  comentario:   string | null
  created_at:   string
  profiles:     { nome: string; username: string; foto_url: string | null }
}

function Estrelas({ nota, tamanho = 18, interativo = false, onChange }: {
  nota: number; tamanho?: number; interativo?: boolean; onChange?: (n: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" disabled={!interativo}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => interativo && setHover(n)}
          onMouseLeave={() => interativo && setHover(0)}
          className={interativo ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
        >
          <Star size={tamanho} className={n <= (hover || nota) ? 'text-yellow-400 fill-yellow-400' : 'text-brand-muted'} />
        </button>
      ))}
    </div>
  )
}

export default function PerfilPage() {
  const params   = useParams()
  const router   = useRouter()
  const userId   = params.id as string
  const { user } = useAuth()
  const { iniciarConversa } = useChat()

  const [perfil,         setPerfil]         = useState<Profile | null>(null)
  const [carteira,       setCarteira]       = useState<PortfolioAsset[]>([])
  const [portfolioId,    setPortfolioId]    = useState<string | null>(null)
  const [seguidores,     setSeguidores]     = useState(0)
  const [seguindo,       setSeguindo]       = useState(0)
  const [totalPosts,     setTotalPosts]     = useState(0)
  const [jaSigo,         setJaSigo]         = useState(false)
  const [carregando,     setCarregando]     = useState(true)
  const [abaAtiva,       setAbaAtiva]       = useState<'movimentacao' | 'tese' | 'enquetes' | 'carteira'>('movimentacao')
  const [iniciandoChat,  setIniciandoChat]  = useState(false)

  const [avaliacoes,      setAvaliacoes]      = useState<Avaliacao[]>([])
  const [notaMedia,       setNotaMedia]       = useState(0)
  const [minhaAvalia,     setMinhaAvalia]     = useState<Avaliacao | null>(null)
  const [novaNota,        setNovaNota]        = useState(0)
  const [novoComentario,  setNovoComentario]  = useState('')
  const [enviandoAvalia,  setEnviandoAvalia]  = useState(false)

  const ehMeuPerfil = user?.id === userId

  useEffect(() => { if (userId) carregarPerfil() }, [userId, user])

  const carregarPerfil = async () => {
    setCarregando(true)
    const [{ data: perfilData }, { count: segCount }, { count: segdoCount }, { count: postsCount }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    setPerfil(perfilData)
    setSeguidores(segCount ?? 0)
    setSeguindo(segdoCount ?? 0)
    setTotalPosts(postsCount ?? 0)

    if (user) {
      const { count } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', user.id).eq('following_id', userId)
      setJaSigo((count ?? 0) > 0)
    }

    const { data: portfolioData } = await supabase.from('portfolios').select('*, portfolio_assets(*)').eq('user_id', userId).single()
    if (portfolioData) {
      setPortfolioId(portfolioData.id)
      setCarteira(portfolioData.portfolio_assets ?? [])
      carregarAvaliacoes(portfolioData.id)
    }
    setCarregando(false)
  }

  const carregarAvaliacoes = async (pId: string) => {
    const { data } = await supabase
      .from('carteira_avaliacoes')
      .select('*, profiles:user_id(nome, username, foto_url)')
      .eq('portfolio_id', pId)
      .order('created_at', { ascending: false })
    const lista = (data as Avaliacao[]) ?? []
    setAvaliacoes(lista)
    setNotaMedia(lista.length ? lista.reduce((s, a) => s + a.nota, 0) / lista.length : 0)
    if (user) {
      const minha = lista.find((a) => a.user_id === user.id) ?? null
      setMinhaAvalia(minha)
      if (minha) { setNovaNota(minha.nota); setNovoComentario(minha.comentario ?? '') }
    }
  }

  const handleSeguir = async () => {
    if (!user) { toast.error('Faça login'); return }
    if (jaSigo) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', userId)
      setJaSigo(false); setSeguidores((s) => s - 1)
      toast.success(`Deixou de seguir @${perfil?.username}`)
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: userId })
      setJaSigo(true); setSeguidores((s) => s + 1)
      toast.success(`Seguindo @${perfil?.username}!`)
      await criarNotificacao({ userId, actorId: user.id, tipo: 'seguiu' })
    }
  }

  const handleEnviarMensagem = async () => {
    if (!user) { toast.error('Faça login'); return }
    if (!jaSigo) { toast.error('Você precisa seguir este usuário para enviar mensagem'); return }
    setIniciandoChat(true)
    const convId = await iniciarConversa(userId)
    setIniciandoChat(false)
    if (convId) {
      router.push(`/main/chat?id=${convId}`)
    } else {
      toast.error('Erro ao iniciar conversa')
    }
  }

  const handleAvaliar = async () => {
    if (!user || !portfolioId) return
    if (novaNota === 0) { toast.error('Selecione uma nota'); return }
    setEnviandoAvalia(true)
    if (minhaAvalia) {
      await supabase.from('carteira_avaliacoes').update({ nota: novaNota, comentario: novoComentario.trim() || null }).eq('id', minhaAvalia.id)
      toast.success('Avaliação atualizada!')
    } else {
      await supabase.from('carteira_avaliacoes').insert({ portfolio_id: portfolioId, user_id: user.id, nota: novaNota, comentario: novoComentario.trim() || null })
      toast.success('Avaliação enviada! ⭐')
    }
    setEnviandoAvalia(false)
    carregarAvaliacoes(portfolioId)
  }

  const handleDeletarAvaliacao = async () => {
    if (!minhaAvalia || !portfolioId) return
    await supabase.from('carteira_avaliacoes').delete().eq('id', minhaAvalia.id)
    setMinhaAvalia(null); setNovaNota(0); setNovoComentario('')
    toast.success('Avaliação removida')
    carregarAvaliacoes(portfolioId)
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-8 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-brand-surface" />
            <div className="flex-1"><div className="h-4 bg-brand-surface rounded w-40 mb-2" /><div className="h-3 bg-brand-surface rounded w-24" /></div>
          </div>
        </div>
      </div>
    )
  }

  if (!perfil) return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="card p-10 text-center"><p className="text-brand-muted">Perfil não encontrado</p></div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-brand-surface border-2 border-brand-border overflow-hidden">
              {perfil.foto_url
                ? <img src={perfil.foto_url} alt={perfil.nome} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-brand-muted">{perfil.nome[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{perfil.nome}</h1>
              <p className="text-brand-muted text-sm">@{perfil.username}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {(perfil as any).localizacao && <span className="flex items-center gap-1 text-xs text-brand-muted"><MapPin size={11} />{(perfil as any).localizacao}</span>}
                {(perfil as any).idade && <span className="flex items-center gap-1 text-xs text-brand-muted"><Calendar size={11} />{(perfil as any).idade} anos</span>}
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          {ehMeuPerfil ? (
            <button onClick={() => router.push('/main/editar')} className="btn-outline flex items-center gap-1.5 text-sm">
              <Edit3 size={14} /> Editar
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={handleSeguir}
                className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${jaSigo ? 'border-brand-border text-brand-muted hover:border-red-400 hover:text-red-400' : 'border-brand-green bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-brand-dark'}`}
              >
                {jaSigo ? <><UserCheck size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}
              </button>

              {/* Botão enviar mensagem — só aparece se segue */}
              {jaSigo && (
                <button onClick={handleEnviarMensagem} disabled={iniciandoChat}
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-brand-border text-brand-muted hover:text-white hover:border-brand-green transition-all disabled:opacity-50"
                >
                  {iniciandoChat
                    ? <div className="w-3 h-3 border-2 border-brand-muted border-t-transparent rounded-full animate-spin" />
                    : <><MessageCircle size={14} /> Mensagem</>
                  }
                </button>
              )}
            </div>
          )}
        </div>

        {perfil.bio && <p className="text-sm text-gray-300 mb-4">{perfil.bio}</p>}

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-brand-border">
          {[
            { label: 'Posts',      valor: totalPosts, href: null },
            { label: 'Seguidores', valor: seguidores, href: `/main/perfil/${userId}/seguidores` },
            { label: 'Seguindo',   valor: seguindo,   href: `/main/perfil/${userId}/seguindo`   },
          ].map(({ label, valor, href }) => (
            <div key={label} className="text-center">
              {href ? (
                <Link href={href} className="group block">
                  <p className="text-xl font-bold text-white group-hover:text-brand-green transition-colors">{formatarNumero(valor)}</p>
                  <p className="text-xs text-brand-muted mt-0.5 group-hover:text-brand-green transition-colors">{label}</p>
                </Link>
              ) : (
                <><p className="text-xl font-bold text-white">{formatarNumero(valor)}</p><p className="text-xs text-brand-muted mt-0.5">{label}</p></>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Abas */}
      <div className="card p-1 flex gap-1">
        {(['movimentacao', 'tese', 'enquetes', 'carteira'] as const).map((aba) => (
          <button key={aba} onClick={() => setAbaAtiva(aba)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${abaAtiva === aba ? 'bg-brand-green text-brand-dark' : 'text-brand-muted hover:text-white'}`}
          >
            {aba === 'movimentacao' ? 'Movim.' : aba === 'tese' ? 'Teses' : aba === 'enquetes' ? '📊 Enquetes' : 'Carteira'}
          </button>
        ))}
      </div>

      {(abaAtiva === 'movimentacao' || abaAtiva === 'tese') && <PerfilFeedList profileUserId={userId} tipo={abaAtiva} />}

      {abaAtiva === 'enquetes' && <EnquetesEncerradas userId={userId} />}

      {abaAtiva === 'carteira' && (
        <div className="space-y-4">
          {carteira.length > 0 ? (
            <>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-brand-muted">Distribuição proporcional</p>
                  {notaMedia > 0 && (
                    <div className="flex items-center gap-2">
                      <Estrelas nota={Math.round(notaMedia)} tamanho={14} />
                      <span className="text-sm font-bold text-yellow-400">{notaMedia.toFixed(1)}</span>
                      <span className="text-xs text-brand-muted">({avaliacoes.length})</span>
                    </div>
                  )}
                </div>
                <CarteiraChart assets={carteira.map((a) => ({ classe: a.classe as AssetClasse, nome: a.nome, percentual: a.percentual }))} />
              </div>

              <div className="card p-5">
                <p className="text-sm font-semibold text-white mb-4">
                  Composição da carteira
                  <span className="text-brand-muted font-normal text-xs ml-2">({carteira.length} ativo{carteira.length !== 1 ? 's' : ''})</span>
                </p>
                <div className="space-y-2">
                  {[...carteira].sort((a, b) => b.percentual - a.percentual).map((ativo) => (
                    <div key={ativo.id} className="flex items-center gap-3 py-2 border-b border-brand-border/40 last:border-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ASSET_CLASSE_COLORS[ativo.classe as AssetClasse] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">{ativo.nome}</span>
                          {ativo.ticker && <span className="text-xs text-brand-muted bg-brand-surface px-1.5 py-0.5 rounded shrink-0">{ativo.ticker}</span>}
                        </div>
                        <span className="text-xs text-brand-muted">{ASSET_CLASSE_LABELS[ativo.classe as AssetClasse]}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-brand-green">{ativo.percentual.toFixed(1)}%</p>
                        <div className="w-16 h-1 bg-brand-surface rounded-full mt-1">
                          <div className="h-full rounded-full" style={{ width: `${ativo.percentual}%`, backgroundColor: ASSET_CLASSE_COLORS[ativo.classe as AssetClasse] }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <p className="text-sm font-semibold text-white mb-4">
                  Avaliações da carteira
                  {notaMedia > 0 && <span className="ml-2 text-yellow-400 font-bold">⭐ {notaMedia.toFixed(1)}</span>}
                </p>
                {user && !ehMeuPerfil && (
                  <div className="bg-brand-surface rounded-xl p-4 mb-4 border border-brand-border">
                    <p className="text-xs text-brand-muted mb-3">{minhaAvalia ? 'Sua avaliação:' : 'Avalie esta carteira:'}</p>
                    <Estrelas nota={novaNota} tamanho={24} interativo onChange={setNovaNota} />
                    <input type="text" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Deixe um comentário (opcional)" maxLength={200} className="input text-sm mt-3 w-full" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleAvaliar} disabled={enviandoAvalia || novaNota === 0} className="btn-primary flex items-center gap-1.5 text-sm flex-1 justify-center disabled:opacity-50">
                        {enviandoAvalia ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <><Send size={13} /> {minhaAvalia ? 'Atualizar' : 'Enviar avaliação'}</>}
                      </button>
                      {minhaAvalia && (
                        <button onClick={handleDeletarAvaliacao} className="p-2 text-brand-muted hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </div>
                )}
                {avaliacoes.length === 0 ? (
                  <p className="text-center text-brand-muted text-sm py-4">{ehMeuPerfil ? 'Nenhuma avaliação ainda.' : 'Seja o primeiro a avaliar!'}</p>
                ) : (
                  <div className="space-y-3">
                    {avaliacoes.map((a) => (
                      <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 py-2 border-b border-brand-border/40 last:border-0">
                        <Link href={`/main/perfil/${a.user_id}`}>
                          <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                            {a.profiles?.foto_url ? <img src={a.profiles.foto_url} alt={a.profiles.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-muted">{a.profiles?.nome?.[0]?.toUpperCase()}</div>}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">{a.profiles?.nome}</span>
                            <Estrelas nota={a.nota} tamanho={12} />
                            <span className="text-xs text-brand-muted ml-auto">{tempoRelativo(a.created_at)}</span>
                          </div>
                          {a.comentario && <p className="text-xs text-gray-300">{a.comentario}</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-brand-muted text-sm">{ehMeuPerfil ? 'Configure sua carteira na aba Carteira.' : 'Este usuário ainda não configurou a carteira.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
