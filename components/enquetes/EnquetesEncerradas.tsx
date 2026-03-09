'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Clock, CheckCircle2, MessageCircle, Send, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { cn, tempoRelativo } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Poll } from '@/hooks/usePolls'

type PollComment = {
  id: string; poll_id: string; user_id: string; conteudo: string; created_at: string
  profiles: { id: string; nome: string; username: string; foto_url: string | null }
}

function CardEnqueteEncerrada({ poll }: { poll: Poll }) {
  const { user } = useAuth()
  const [expandido,    setExpandido]    = useState(false)
  const [comentarios,  setComentarios]  = useState<PollComment[]>([])
  const [novoComent,   setNovoComent]   = useState('')
  const [enviando,     setEnviando]     = useState(false)
  const [carregou,     setCarregou]     = useState(false)

  const votosOpcao = (id: string) => poll.votos.filter(v => v.opcao_id === id).length
  const percentual = (id: string) => poll.total_votos === 0 ? 0 : Math.round((votosOpcao(id) / poll.total_votos) * 100)
  const maxPct     = Math.max(...poll.opcoes.map(o => percentual(o.id)))

  const carregarComentarios = async () => {
    if (carregou) return
    const { data } = await supabase
      .from('poll_comments')
      .select('*, profiles:user_id(id, nome, username, foto_url)')
      .eq('poll_id', poll.id)
      .order('created_at', { ascending: true })
    setComentarios((data as PollComment[]) ?? [])
    setCarregou(true)
  }

  const handleExpandir = () => {
    if (!expandido) carregarComentarios()
    setExpandido(!expandido)
  }

  const handleComentar = async () => {
    if (!user || !novoComent.trim()) return
    setEnviando(true)
    const { data, error } = await supabase
      .from('poll_comments')
      .insert({ poll_id: poll.id, user_id: user.id, conteudo: novoComent.trim() })
      .select('*, profiles:user_id(id, nome, username, foto_url)')
      .single()
    setEnviando(false)
    if (!error && data) { setComentarios(prev => [...prev, data as PollComment]); setNovoComent('') }
    else toast.error('Erro ao comentar')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
          📊 Enquete Encerrada
        </span>
        <span className="text-xs text-brand-muted ml-auto">
          {new Date(poll.expira_em).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Pergunta */}
      <div className="flex items-start gap-2 mb-4">
        <BarChart2 size={16} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-white font-semibold text-sm leading-snug">{poll.pergunta}</p>
      </div>

      {/* Resultados */}
      <div className="space-y-2 mb-4">
        {poll.opcoes.map(opcao => {
          const pct        = percentual(opcao.id)
          const isVencedora = pct === maxPct && pct > 0
          const isVotada   = poll.meu_voto === opcao.id
          return (
            <div key={opcao.id} className={cn('relative rounded-xl overflow-hidden border', isVencedora ? 'border-yellow-500/40' : 'border-brand-border')}>
              <div className={cn('absolute inset-y-0 left-0 transition-all duration-700', isVencedora ? 'bg-yellow-500/15' : 'bg-brand-surface')}
                style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {isVotada && <CheckCircle2 size={12} className="text-brand-green shrink-0" />}
                  <span className={cn('text-xs font-medium', isVencedora ? 'text-white' : 'text-gray-400')}>{opcao.texto}</span>
                </div>
                <span className={cn('text-xs font-bold shrink-0', isVencedora ? 'text-yellow-400' : 'text-brand-muted')}>{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-brand-muted border-t border-brand-border/50 pt-3">
        <span>{poll.total_votos} voto{poll.total_votos !== 1 ? 's' : ''}</span>
        <button onClick={handleExpandir} className="flex items-center gap-1.5 hover:text-white transition-colors">
          <MessageCircle size={13} />
          <span>{comentarios.length > 0 ? `${comentarios.length} comentário${comentarios.length !== 1 ? 's' : ''}` : 'Comentar'}</span>
        </button>
      </div>

      {/* Comentários expandíveis */}
      <AnimatePresence>
        {expandido && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-3">
              {comentarios.length === 0 && (
                <p className="text-brand-muted text-xs text-center py-2">Nenhum comentário ainda.</p>
              )}
              {comentarios.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Link href={`/main/perfil/${c.profiles?.id}`}>
                    <div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                      {c.profiles?.foto_url
                        ? <img src={c.profiles.foto_url} alt={c.profiles.nome} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-brand-muted">{c.profiles?.nome?.[0]?.toUpperCase()}</div>
                      }
                    </div>
                  </Link>
                  <div className="flex-1 bg-brand-surface rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{c.profiles?.nome}</span>
                      <span className="text-xs text-brand-muted">· {tempoRelativo(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-300">{c.conteudo}</p>
                  </div>
                </div>
              ))}

              {user && (
                <div className="flex gap-2 pt-1">
                  <input value={novoComent} onChange={e => setNovoComent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleComentar() }}
                    placeholder="Comentar resultado..." maxLength={500}
                    className="input text-xs py-2 flex-1"
                  />
                  <button onClick={handleComentar} disabled={enviando || !novoComent.trim()}
                    className="btn-primary px-3 py-2 disabled:opacity-50"
                  >
                    {enviando ? <div className="w-3 h-3 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

type Props = { userId: string }

export function EnquetesEncerradas({ userId }: Props) {
  const { user } = useAuth()
  const [polls,   setPolls]   = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase
        .from('polls')
        .select('*, profiles:user_id(id, nome, username, foto_url), poll_votes(opcao_id, user_id)')
        .eq('user_id', userId)
        .lt('expira_em', new Date().toISOString())
        .order('created_at', { ascending: false })

      const enriquecidas: Poll[] = (data ?? []).map((p: any) => {
        const votos   = p.poll_votes ?? []
        const meuVoto = user ? (votos.find((v: any) => v.user_id === user.id)?.opcao_id ?? null) : null
        return { ...p, votos, meu_voto: meuVoto, ativa: false, total_votos: votos.length }
      })

      setPolls(enriquecidas)
      setLoading(false)
    }
    carregar()
  }, [userId, user])

  if (loading) return <div className="animate-pulse h-20 bg-brand-surface rounded-xl" />
  if (polls.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-brand-muted flex items-center gap-2">
        <BarChart2 size={14} /> Enquetes encerradas
      </h3>
      {polls.map(poll => <CardEnqueteEncerrada key={poll.id} poll={poll} />)}
    </div>
  )
}
