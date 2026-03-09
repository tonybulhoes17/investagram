'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, CheckCircle2, Trash2, BarChart2, MessageCircle, Send } from 'lucide-react'
import { usePolls, type Poll } from '@/hooks/usePolls'
import { useAuth } from '@/hooks/useAuth'
import { cn, tempoRelativo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'

type PollComment = {
  id: string
  poll_id: string
  user_id: string
  conteudo: string
  created_at: string
  profiles: { id: string; nome: string; username: string; foto_url: string | null }
}

function tempoRestante(expiraEm: string) {
  const diff = new Date(expiraEm).getTime() - Date.now()
  if (diff <= 0) return 'Encerrada'
  const horas = Math.floor(diff / (1000 * 60 * 60))
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (horas > 0) return `${horas}h restantes`
  return `${mins}min restantes`
}

function ModalEnquete({ poll, onClose, onVotar, onDeletar }: {
  poll: Poll; onClose: () => void; onVotar: (opcaoId: string) => void; onDeletar: () => void
}) {
  const { user } = useAuth()
  const [votando,      setVotando]      = useState(false)
  const [comentarios,  setComentarios]  = useState<PollComment[]>([])
  const [novoComent,   setNovoComent]   = useState('')
  const [enviando,     setEnviando]     = useState(false)
  const [abaAtiva,     setAbaAtiva]     = useState<'votos'|'comentarios'>('votos')
  const [carregouComt, setCarregouComt] = useState(false)
  const ehMeu = user?.id === poll.user_id
  const mostrarResultado = !!poll.meu_voto || !poll.ativa

  const carregarComentarios = async () => {
    if (carregouComt) return
    const { data } = await supabase
      .from('poll_comments')
      .select('*, profiles:user_id(id, nome, username, foto_url)')
      .eq('poll_id', poll.id)
      .order('created_at', { ascending: true })
    setComentarios((data as PollComment[]) ?? [])
    setCarregouComt(true)
  }

  const handleAba = (aba: 'votos'|'comentarios') => {
    setAbaAtiva(aba)
    if (aba === 'comentarios') carregarComentarios()
  }

  const handleVotar = async (opcaoId: string) => {
    if (!poll.ativa || poll.meu_voto || votando) return
    setVotando(true)
    await onVotar(opcaoId)
    setVotando(false)
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
    if (!error && data) {
      setComentarios(prev => [...prev, data as PollComment])
      setNovoComent('')
    } else {
      toast.error('Erro ao comentar')
    }
  }

  const votosOpcao  = (id: string) => poll.votos.filter(v => v.opcao_id === id).length
  const percentual  = (id: string) => poll.total_votos === 0 ? 0 : Math.round((votosOpcao(id) / poll.total_votos) * 100)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-brand-border shrink-0">
          {poll.ativa && (
            <div className="w-full h-1 bg-brand-surface rounded-full mb-4 overflow-hidden">
              <motion.div className="h-full bg-brand-green rounded-full" initial={{ width: '100%' }} animate={{ width: '0%' }}
                transition={{ duration: (new Date(poll.expira_em).getTime() - Date.now()) / 1000, ease: 'linear' }} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-surface border-2 border-brand-green overflow-hidden shrink-0">
              {poll.profiles?.foto_url
                ? <img src={poll.profiles.foto_url} alt={poll.profiles.nome} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-muted">{poll.profiles?.nome?.[0]?.toUpperCase()}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{poll.profiles?.nome}</p>
              <div className="flex items-center gap-1.5">
                <Clock size={11} className={poll.ativa ? 'text-brand-green' : 'text-brand-muted'} />
                <span className={`text-xs ${poll.ativa ? 'text-brand-green' : 'text-brand-muted'}`}>{tempoRestante(poll.expira_em)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {ehMeu && (
                <button onClick={onDeletar} className="p-1.5 text-brand-muted hover:text-red-400 transition-colors rounded-lg">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 text-brand-muted hover:text-white transition-colors rounded-lg">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mt-4 bg-brand-surface rounded-xl p-1">
            <button onClick={() => handleAba('votos')}
              className={cn('flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors', abaAtiva === 'votos' ? 'bg-brand-card text-white' : 'text-brand-muted hover:text-white')}
            >📊 Enquete</button>
            <button onClick={() => handleAba('comentarios')}
              className={cn('flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors', abaAtiva === 'comentarios' ? 'bg-brand-card text-white' : 'text-brand-muted hover:text-white')}
            >💬 Comentários</button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1">
          {abaAtiva === 'votos' && (
            <div className="px-5 py-4">
              <div className="flex items-start gap-2 mb-5">
                <BarChart2 size={18} className="text-brand-green shrink-0 mt-0.5" />
                <p className="text-white font-semibold text-base leading-snug">{poll.pergunta}</p>
              </div>
              <div className="space-y-3">
                {poll.opcoes.map(opcao => {
                  const pct = percentual(opcao.id)
                  const isVotada = poll.meu_voto === opcao.id
                  const maxPct = Math.max(...poll.opcoes.map(o => percentual(o.id)))
                  const isVencedora = mostrarResultado && pct === maxPct && pct > 0
                  return (
                    <button key={opcao.id} onClick={() => handleVotar(opcao.id)}
                      disabled={mostrarResultado || votando}
                      className={cn('relative w-full rounded-xl overflow-hidden transition-all text-left',
                        !mostrarResultado && poll.ativa ? 'hover:border-brand-green border border-brand-border bg-brand-surface cursor-pointer' : 'cursor-default',
                        isVotada ? 'border border-brand-green' : 'border border-brand-border'
                      )}
                    >
                      {mostrarResultado && (
                        <div className={cn('absolute inset-y-0 left-0 transition-all duration-700', isVencedora ? 'bg-brand-green/20' : 'bg-brand-surface')} style={{ width: `${pct}%` }} />
                      )}
                      <div className="relative flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isVotada && <CheckCircle2 size={14} className="text-brand-green shrink-0" />}
                          <span className={cn('text-sm font-medium', isVencedora && mostrarResultado ? 'text-white' : 'text-gray-300')}>{opcao.texto}</span>
                        </div>
                        {mostrarResultado && (
                          <span className={cn('text-sm font-bold shrink-0', isVencedora ? 'text-brand-green' : 'text-brand-muted')}>{pct}%</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-brand-muted text-center mt-4">
                {poll.total_votos} voto{poll.total_votos !== 1 ? 's' : ''}
                {!poll.ativa && ' · Enquete encerrada'}
                {poll.ativa && !poll.meu_voto && ' · Clique para votar'}
              </p>
            </div>
          )}

          {abaAtiva === 'comentarios' && (
            <div className="px-4 py-3 space-y-3">
              {comentarios.length === 0 && (
                <p className="text-brand-muted text-sm text-center py-6">Nenhum comentário ainda. Seja o primeiro! 💬</p>
              )}
              {comentarios.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Link href={`/main/perfil/${c.profiles?.id}`} onClick={onClose}>
                    <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                      {c.profiles?.foto_url
                        ? <img src={c.profiles.foto_url} alt={c.profiles.nome} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-muted">{c.profiles?.nome?.[0]?.toUpperCase()}</div>
                      }
                    </div>
                  </Link>
                  <div className="flex-1 bg-brand-surface rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{c.profiles?.nome}</span>
                      <span className="text-xs text-brand-muted">· {tempoRelativo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-300">{c.conteudo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input comentário */}
        {abaAtiva === 'comentarios' && user && (
          <div className="p-4 border-t border-brand-border shrink-0 flex gap-2">
            <input
              value={novoComent}
              onChange={e => setNovoComent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleComentar() }}
              placeholder="Comentar enquete..."
              className="input text-sm flex-1 py-2"
              maxLength={500}
            />
            <button onClick={handleComentar} disabled={enviando || !novoComent.trim()}
              className="btn-primary px-3 py-2 disabled:opacity-50"
            >
              {enviando ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function StoriesPolls() {
  const { polls, loading, votar, deletarPoll } = usePolls()
  const [pollAberta, setPollAberta] = useState<Poll | null>(null)

  const ativas = polls.filter(p => p.ativa)
  if (loading || ativas.length === 0) return null

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-hide py-4 px-4">
        <div className="flex items-center gap-4 w-max">
          {ativas.map((poll, i) => (
            <motion.button key={poll.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }} onClick={() => setPollAberta(poll)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-brand-green via-emerald-400 to-teal-300">
                  <div className="w-full h-full rounded-full bg-brand-dark p-0.5">
                    <div className="w-full h-full rounded-full bg-brand-surface overflow-hidden">
                      {poll.profiles?.foto_url
                        ? <img src={poll.profiles.foto_url} alt={poll.profiles.nome} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-brand-muted">{poll.profiles?.nome?.[0]?.toUpperCase()}</div>
                      }
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-green rounded-full flex items-center justify-center border-2 border-brand-dark">
                  <BarChart2 size={10} className="text-brand-dark" />
                </div>
              </div>
              <p className="text-xs text-white font-medium max-w-[64px] truncate text-center">{poll.profiles?.nome?.split(' ')[0]}</p>
            </motion.button>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {pollAberta && (
          <ModalEnquete poll={pollAberta} onClose={() => setPollAberta(null)}
            onVotar={async opcaoId => { await votar(pollAberta.id, opcaoId); setPollAberta(null) }}
            onDeletar={async () => { await deletarPoll(pollAberta.id); setPollAberta(null) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
