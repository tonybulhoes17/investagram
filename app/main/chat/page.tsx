'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, ArrowLeft, Search, ImagePlus, X, Mic } from 'lucide-react'
import { useChat, useMensagens } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { tempoRelativo, cn } from '@/lib/utils'
import { AudioRecorder, AudioPlayer } from '@/components/AudioRecorder'
import Link from 'next/link'
import toast from 'react-hot-toast'

// ── Bolha de imagem clicável ─────────────────────────────────
function BolhaImagem({ url, ehMeu }: { url: string; ehMeu: boolean }) {
  const [modal, setModal] = useState(false)
  return (
    <>
      <div
        className={cn(
          'rounded-2xl overflow-hidden border cursor-pointer max-w-[220px]',
          ehMeu ? 'rounded-br-sm border-brand-green/30' : 'rounded-bl-sm border-brand-border'
        )}
        onClick={() => setModal(true)}
      >
        <img src={url} alt="Imagem" className="w-full object-cover hover:opacity-90 transition-opacity" />
      </div>
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setModal(false)}
          >
            <button onClick={() => setModal(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full">
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={url} alt="Imagem"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Preview da mídia antes de enviar ────────────────────────
function PreviewMidia({
  imagemPreview, audioPreviewUrl, onRemoverImagem, onRemoverAudio
}: {
  imagemPreview:   string | null
  audioPreviewUrl: string | null
  onRemoverImagem: () => void
  onRemoverAudio:  () => void
}) {
  if (!imagemPreview && !audioPreviewUrl) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="px-4 pb-2 flex flex-wrap gap-2"
    >
      {imagemPreview && (
        <div className="relative">
          <img src={imagemPreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-brand-border" />
          <button onClick={onRemoverImagem} className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full">
            <X size={11} />
          </button>
        </div>
      )}
      {audioPreviewUrl && (
        <div className="relative flex items-center bg-brand-surface border border-brand-border rounded-xl px-3 py-2 pr-8">
          <AudioPlayer url={audioPreviewUrl} />
          <button onClick={onRemoverAudio} className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full">
            <X size={11} />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ── Tela de mensagens de uma conversa ───────────────────────
function TelaConversa({ conversaId, onVoltar }: { conversaId: string; onVoltar: () => void }) {
  const { user } = useAuth()
  const { mensagens, loading, enviando, enviarMensagem, bottomRef } = useMensagens(conversaId)
  const { conversas } = useChat()

  const [texto,           setTexto]           = useState('')
  const [imagemFile,      setImagemFile]      = useState<File | null>(null)
  const [imagemPreview,   setImagemPreview]   = useState<string | null>(null)
  const [audioFile,       setAudioFile]       = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [mostrarGravador, setMostrarGravador] = useState(false)
  const inputImagemRef = useRef<HTMLInputElement>(null)

  const conversa  = conversas.find((c) => c.id === conversaId)
  const podEnviar = !!texto.trim() || !!imagemFile || !!audioFile

  const handleImagemSelecionada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 5MB'); return }
    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
    if (inputImagemRef.current) inputImagemRef.current.value = ''
  }

  const removerImagem = () => { setImagemFile(null); setImagemPreview(null) }
  const removerAudio  = () => { setAudioFile(null);  setAudioPreviewUrl(null) }

  const handleEnviar = async () => {
    if (!podEnviar) return
    await enviarMensagem(texto, {
      imagemFile: imagemFile ?? undefined,
      audioFile:  audioFile  ?? undefined,
    })
    setTexto('')
    removerImagem()
    removerAudio()
    setMostrarGravador(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">

      {/* Cabeçalho */}
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

      {/* Lista de mensagens */}
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
          const ehMeu        = msg.sender_id === user?.id
          const anterior     = mensagens[i - 1]
          const mesmoPessoa  = anterior?.sender_id === msg.sender_id
          const dataAtual    = new Date(msg.created_at).toDateString()
          const dataAnterior = anterior ? new Date(anterior.created_at).toDateString() : null
          const mostrarData  = dataAtual !== dataAnterior

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
                className={cn('flex flex-col gap-1', ehMeu ? 'items-end' : 'items-start', mesmoPessoa ? 'mt-0.5' : 'mt-3')}
              >
                {/* Imagem */}
                {msg.imagem_url && <BolhaImagem url={msg.imagem_url} ehMeu={ehMeu} />}

                {/* Áudio */}
                {msg.audio_url && (
                  <div className={cn(
                    'rounded-2xl border px-3 py-2 max-w-[260px]',
                    ehMeu
                      ? 'bg-brand-green/10 border-brand-green/30 rounded-br-sm'
                      : 'bg-brand-surface border-brand-border rounded-bl-sm'
                  )}>
                    <AudioPlayer url={msg.audio_url} />
                  </div>
                )}

                {/* Texto */}
                {msg.conteudo && (
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
                )}

                {/* Horário quando só tem mídia */}
                {!msg.conteudo && (msg.imagem_url || msg.audio_url) && (
                  <p className="text-[10px] text-brand-muted">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </motion.div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Gravador inline */}
      <AnimatePresence>
        {mostrarGravador && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2 overflow-hidden border-t border-brand-border/50"
          >
            <div className="pt-3">
              <AudioRecorder
                onAudioPronto={(file, url) => {
                  setAudioFile(file)
                  setAudioPreviewUrl(url)
                  setMostrarGravador(false)
                }}
                onCancelar={() => setMostrarGravador(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview de mídia pendente */}
      <AnimatePresence>
        <PreviewMidia
          imagemPreview={imagemPreview}
          audioPreviewUrl={audioPreviewUrl}
          onRemoverImagem={removerImagem}
          onRemoverAudio={removerAudio}
        />
      </AnimatePresence>

      {/* Barra de input */}
      <div className="p-4 border-t border-brand-border bg-brand-card">
        <div className="flex items-center gap-2">

          {/* Foto */}
          <button
            type="button"
            onClick={() => inputImagemRef.current?.click()}
            title="Enviar foto"
            className={cn(
              'p-2.5 rounded-xl border transition-all shrink-0',
              imagemFile
                ? 'border-brand-green text-brand-green bg-brand-green/10'
                : 'border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green/50'
            )}
          >
            <ImagePlus size={17} />
          </button>

          {/* Áudio */}
          <button
            type="button"
            title="Gravar áudio"
            onClick={() => {
              if (audioFile) { removerAudio(); return }
              setMostrarGravador((v) => !v)
            }}
            className={cn(
              'p-2.5 rounded-xl border transition-all shrink-0',
              audioFile || mostrarGravador
                ? 'border-brand-green text-brand-green bg-brand-green/10'
                : 'border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green/50'
            )}
          >
            <Mic size={17} />
          </button>

          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
            placeholder={imagemFile || audioFile ? 'Legenda (opcional)...' : 'Digite uma mensagem...'}
            maxLength={500}
            className="input text-sm flex-1"
          />

          <button
            onClick={handleEnviar}
            disabled={enviando || !podEnviar}
            className="btn-primary px-3 py-2.5 disabled:opacity-50 shrink-0"
          >
            {enviando
              ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>

        <input
          ref={inputImagemRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleImagemSelecionada}
          className="hidden"
        />
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
  const { recarregar, zerarNaoLidas } = useChat()
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) handleSelecionar(id)
  }, [])

  const handleSelecionar = async (id: string) => {
    setConversaAtiva(id)
    await zerarNaoLidas(id)
    setTimeout(() => recarregar(), 800)
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
