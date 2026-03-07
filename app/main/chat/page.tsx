'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageCircle, Send, ArrowLeft, Search } from 'lucide-react'
import { useChat, useMensagens } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { tempoRelativo, cn } from '@/lib/utils'
import Link from 'next/link'

// ── Tela de mensagens de uma conversa ───────────────────────
function TelaConversa({ conversaId, onVoltar }: { conversaId: string; onVoltar: () => void }) {
  const { user } = useAuth()
  const { mensagens, loading, enviando, enviarMensagem, bottomRef } = useMensagens(conversaId)
  const { conversas } = useChat()
  const [texto, setTexto] = useState('')

  const conversa = conversas.find((c) => c.id === conversaId)

  const handleEnviar = async () => {
    if (!texto.trim()) return
    await enviarMensagem(texto)
    setTexto('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3 p-4 border-b border-brand-border bg-brand-card">
        <button onClick={onVoltar} className="p-1.5 text-brand-muted hover:text-white transition-colors md:hidden">
          <ArrowLeft size={18} />
        </button>
        {conversa && (
          <Link href={`/main/perfil/${conversa.outro.id}`} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
              {conversa.outro.foto_url
                ? <img src={conversa.outro.foto_url} alt={conversa.outro.nome} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-muted">{conversa.outro.nome[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors">{conversa.outro.nome}</p>
              <p className="text-xs text-brand-muted">@{conversa.outro.username}</p>
            </div>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={32} className="text-brand-muted mb-3" />
            <p className="text-white font-semibold mb-1">Nenhuma mensagem ainda</p>
            <p className="text-brand-muted text-sm">Inicie a conversa! 👋</p>
          </div>
        )}

        {mensagens.map((msg, i) => {
          const ehMeu = msg.sender_id === user?.id
          const anterior = mensagens[i - 1]
          const mesmoPessoa = anterior?.sender_id === msg.sender_id
          const dataAtual = new Date(msg.created_at).toDateString()
          const dataAnterior = anterior ? new Date(anterior.created_at).toDateString() : null
          const mostrarData = dataAtual !== dataAnterior

          return (
            <div key={msg.id}>
              {mostrarData && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-brand-border" />
                  <span className="text-xs text-brand-muted px-2">
                    {new Date(msg.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex-1 h-px bg-brand-border" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', ehMeu ? 'justify-end' : 'justify-start', mesmoPessoa ? 'mt-0.5' : 'mt-3')}
              >
                <div className={cn(
                  'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                  ehMeu
                    ? 'bg-brand-green text-brand-dark rounded-br-sm font-medium'
                    : 'bg-brand-surface text-white border border-brand-border rounded-bl-sm'
                )}>
                  <p>{msg.conteudo}</p>
                  <p className={cn('text-[10px] mt-1 text-right', ehMeu ? 'text-brand-dark/60' : 'text-brand-muted')}>
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-brand-border bg-brand-card">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
            placeholder="Digite uma mensagem..."
            maxLength={500}
            className="input text-sm flex-1"
          />
          <button
            onClick={handleEnviar}
            disabled={enviando || !texto.trim()}
            className="btn-primary px-3 py-2.5 disabled:opacity-50 shrink-0"
          >
            {enviando
              ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lista de conversas ───────────────────────────────────────
function ListaConversas({ conversaAtiva, onSelecionar }: {
  conversaAtiva: string | null
  onSelecionar:  (id: string) => void
}) {
  const { conversas, loading } = useChat()
  const [busca, setBusca] = useState('')

  const filtradas = conversas.filter((c) =>
    c.outro.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.outro.username.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-brand-border">
        <h2 className="text-white font-bold text-lg mb-3">Mensagens</h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversa..."
            className="input pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-3 p-4">
            {[1,2,3].map((n) => (
              <div key={n} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-brand-surface shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-brand-surface rounded w-32 mb-2" />
                  <div className="h-2 bg-brand-surface rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtradas.length === 0 && (
          <div className="p-8 text-center">
            <MessageCircle size={32} className="text-brand-muted mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Nenhuma conversa</p>
            <p className="text-brand-muted text-sm">Visite o perfil de alguém que você segue e inicie uma conversa!</p>
          </div>
        )}

        {filtradas.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelecionar(conv.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-brand-border/40',
              conversaAtiva === conv.id ? 'bg-brand-green/10' : 'hover:bg-brand-surface'
            )}
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-brand-surface border border-brand-border overflow-hidden">
                {conv.outro.foto_url
                  ? <img src={conv.outro.foto_url} alt={conv.outro.nome} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-base font-bold text-brand-muted">{conv.outro.nome[0].toUpperCase()}</div>
                }
              </div>
              {conv.nao_lidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-green text-brand-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                  {conv.nao_lidas > 9 ? '9+' : conv.nao_lidas}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className={cn('text-sm font-semibold truncate', conv.nao_lidas > 0 ? 'text-white' : 'text-gray-300')}>
                  {conv.outro.nome}
                </p>
                <span className="text-[10px] text-brand-muted shrink-0 ml-2">
                  {tempoRelativo(conv.updated_at)}
                </span>
              </div>
              <p className={cn('text-xs truncate', conv.nao_lidas > 0 ? 'text-brand-green font-medium' : 'text-brand-muted')}>
                {conv.ultima_msg ?? 'Inicie a conversa'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Página principal do Chat ─────────────────────────────────
export default function ChatPage() {
  const searchParams = useSearchParams()
  const { conversas, recarregar, zerarNaoLidas } = useChat()
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null)

  // Abre conversa direto se vier ?id= na URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) handleSelecionar(id)
  }, [])

  const handleSelecionar = async (id: string) => {
    setConversaAtiva(id)
    await zerarNaoLidas(id)        // zera badge + marca lido no banco
    setTimeout(() => recarregar(), 800) // recarrega do banco depois
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex h-full border border-brand-border rounded-xl overflow-hidden bg-brand-card">

        <div className={cn('w-full md:w-80 border-r border-brand-border shrink-0', conversaAtiva ? 'hidden md:flex md:flex-col' : 'flex flex-col')}>
          <ListaConversas conversaAtiva={conversaAtiva} onSelecionar={handleSelecionar} />
        </div>

        <div className={cn('flex-1', !conversaAtiva ? 'hidden md:flex md:items-center md:justify-center' : 'flex flex-col')}>
          {conversaAtiva ? (
            <TelaConversa conversaId={conversaAtiva} onVoltar={() => setConversaAtiva(null)} />
          ) : (
            <div className="text-center p-8">
              <MessageCircle size={48} className="text-brand-muted mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">Suas mensagens</p>
              <p className="text-brand-muted text-sm">Selecione uma conversa ou visite o perfil de alguém que você segue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
