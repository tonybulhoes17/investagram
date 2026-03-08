'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, BookOpen, ChevronDown, BarChart2, ImagePlus, X, Mic } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ASSET_CLASSE_LABELS, AssetClasse } from '@/types'
import { calcularScore } from '@/lib/relevancia'
import { CriarEnquete } from '@/components/enquetes/CriarEnquete'
import { AudioRecorder, AudioPlayer } from '@/components/AudioRecorder'
import toast from 'react-hot-toast'

type TipoPost = 'movimentacao' | 'tese' | 'enquete'
type Subtipo  = 'compra' | 'venda'

const CLASSES = Object.entries(ASSET_CLASSE_LABELS) as [AssetClasse, string][]

export default function PublicarPage() {
  const router = useRouter()
  const { user } = useAuth()
  const inputImagemRef = useRef<HTMLInputElement>(null)

  const [tipo,        setTipo]        = useState<TipoPost>('movimentacao')
  const [subtipo,     setSubtipo]     = useState<Subtipo>('compra')
  const [ativoNome,   setAtivoNome]   = useState('')
  const [ativoClasse, setAtivoClasse] = useState<AssetClasse>('acao_br')
  const [dataOp,      setDataOp]      = useState(new Date().toISOString().split('T')[0])
  const [conteudo,    setConteudo]    = useState('')
  const [carregando,  setCarregando]  = useState(false)

  // Imagem
  const [imagemFile,    setImagemFile]    = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [uploadando,    setUploadando]    = useState(false)

  // Áudio
  const [audioFile,       setAudioFile]       = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [mostrarGravador, setMostrarGravador] = useState(false)

  const handleImagemSelecionada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 5MB'); return }
    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
  }

  const removerImagem = () => {
    setImagemFile(null)
    setImagemPreview(null)
    if (inputImagemRef.current) inputImagemRef.current.value = ''
  }

  const uploadImagem = async (): Promise<string | null> => {
    if (!imagemFile || !user) return null
    setUploadando(true)
    const ext      = imagemFile.name.split('.').pop()
    const nomeArquivo = `${Date.now()}.${ext}`
    const caminho = `${user.id}/${nomeArquivo}`
    const { error } = await supabase.storage.from('post-images').upload(caminho, imagemFile, { upsert: true })
    setUploadando(false)
    if (error) { toast.error('Erro ao enviar imagem'); return null }
    const { data } = supabase.storage.from('post-images').getPublicUrl(caminho)
    return data.publicUrl
  }

  const uploadAudio = async (): Promise<string | null> => {
    if (!audioFile || !user) return null
    const caminho = `${user.id}/audio-${Date.now()}.webm`
    const { error } = await supabase.storage.from('post-audios').upload(caminho, audioFile, { upsert: true })
    if (error) { toast.error('Erro ao enviar áudio'); return null }
    const { data } = supabase.storage.from('post-audios').getPublicUrl(caminho)
    return data.publicUrl
  }

  const handlePublicar = async () => {
    if (!user) { toast.error('Faça login para publicar'); return }
    if (tipo === 'movimentacao' && !ativoNome.trim()) { toast.error('Informe o nome do ativo'); return }
    if (tipo === 'tese' && !conteudo.trim()) { toast.error('Escreva o conteúdo da tese'); return }

    setCarregando(true)

    // Faz upload da imagem se houver
    let imagemUrl: string | null = null
    if (imagemFile) {
      imagemUrl = await uploadImagem()
      if (!imagemUrl) { setCarregando(false); return }
    }

    // Faz upload do áudio se houver
    let audioUrl: string | null = null
    if (audioFile) {
      audioUrl = await uploadAudio()
    }

    const score = calcularScore({ likes: 0, comments: 0, seguidores_autor: 0, created_at: new Date().toISOString() })

    const { error } = await supabase.from('posts').insert({
      user_id:          user.id,
      tipo,
      subtipo:          tipo === 'movimentacao' ? subtipo : null,
      ativo_nome:       ativoNome.trim() || null,
      ativo_classe:     tipo === 'movimentacao' ? ativoClasse : null,
      conteudo:         conteudo.trim() || null,
      data_operacao:    tipo === 'movimentacao' ? dataOp : null,
      score_relevancia: score,
      imagem_url:       imagemUrl,
      audio_url:        audioUrl,
    })

    setCarregando(false)

    if (error) {
      toast.error('Erro ao publicar. Tente novamente.')
    } else {
      toast.success('Post publicado! 🚀')
      router.push('/main/feed')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-6">Nova publicação</h1>

      {/* Seletor de tipo */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => setTipo('movimentacao')}
          className={`card p-4 text-center transition-all ${tipo === 'movimentacao' ? 'border-brand-green bg-brand-green/5' : 'hover:border-brand-border/80'}`}
        >
          <TrendingUp size={22} className={`mx-auto mb-2 ${tipo === 'movimentacao' ? 'text-brand-green' : 'text-brand-muted'}`} />
          <p className={`text-xs font-semibold ${tipo === 'movimentacao' ? 'text-brand-green' : 'text-brand-muted'}`}>Movimentação</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Compra ou venda</p>
        </button>

        <button onClick={() => setTipo('tese')}
          className={`card p-4 text-center transition-all ${tipo === 'tese' ? 'border-purple-500 bg-purple-500/5' : 'hover:border-brand-border/80'}`}
        >
          <BookOpen size={22} className={`mx-auto mb-2 ${tipo === 'tese' ? 'text-purple-400' : 'text-brand-muted'}`} />
          <p className={`text-xs font-semibold ${tipo === 'tese' ? 'text-purple-400' : 'text-brand-muted'}`}>Tese</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Análise</p>
        </button>

        <button onClick={() => setTipo('enquete')}
          className={`card p-4 text-center transition-all ${tipo === 'enquete' ? 'border-yellow-500 bg-yellow-500/5' : 'hover:border-brand-border/80'}`}
        >
          <BarChart2 size={22} className={`mx-auto mb-2 ${tipo === 'enquete' ? 'text-yellow-400' : 'text-brand-muted'}`} />
          <p className={`text-xs font-semibold ${tipo === 'enquete' ? 'text-yellow-400' : 'text-brand-muted'}`}>Enquete</p>
          <p className="text-[10px] text-brand-muted mt-0.5">48 horas</p>
        </button>
      </div>

      {tipo === 'enquete' && <CriarEnquete />}

      {tipo !== 'enquete' && (
        <motion.div key={tipo} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-5">

          {tipo === 'movimentacao' && (
            <>
              <div>
                <label className="block text-sm text-brand-muted mb-2">Tipo de operação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setSubtipo('compra')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${subtipo === 'compra' ? 'border-brand-green bg-brand-green/10 text-brand-green' : 'border-brand-border text-brand-muted hover:border-brand-green/50'}`}
                  >
                    <TrendingUp size={16} /><span className="font-semibold">Compra</span>
                  </button>
                  <button onClick={() => setSubtipo('venda')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${subtipo === 'venda' ? 'border-red-400 bg-red-400/10 text-red-400' : 'border-brand-border text-brand-muted hover:border-red-400/50'}`}
                  >
                    <TrendingDown size={16} /><span className="font-semibold">Venda</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Nome do ativo *</label>
                <input type="text" value={ativoNome} onChange={(e) => setAtivoNome(e.target.value)} placeholder="Ex: Bitcoin, PETR4, AAPL..." className="input" />
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Classe do ativo</label>
                <div className="relative">
                  <select value={ativoClasse} onChange={(e) => setAtivoClasse(e.target.value as AssetClasse)} className="input appearance-none pr-10">
                    {CLASSES.map(([valor, label]) => (<option key={valor} value={valor}>{label}</option>))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Data da operação</label>
                <input type="date" value={dataOp} onChange={(e) => setDataOp(e.target.value)} max={new Date().toISOString().split('T')[0]} className="input" />
              </div>
            </>
          )}

          {/* Texto */}
          <div>
            <label className="block text-sm text-brand-muted mb-2">
              {tipo === 'tese' ? 'Tese de investimento *' : 'Comentário / Tese (opcional)'}
            </label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={tipo === 'tese' ? 'Descreva sua análise...' : 'Por que você fez esta operação?'}
              maxLength={tipo === 'tese' ? 2000 : 500}
              rows={tipo === 'tese' ? 6 : 3}
              className="input resize-none"
            />
            <p className="text-xs text-brand-muted mt-1 text-right">{conteudo.length}/{tipo === 'tese' ? 2000 : 500}</p>
          </div>

          {/* Upload de imagem */}
          <div>
            <label className="block text-sm text-brand-muted mb-2">
              Imagem <span className="text-brand-muted/60">(opcional · máx 5MB)</span>
            </label>

            <AnimatePresence mode="wait">
              {imagemPreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="relative rounded-xl overflow-hidden border border-brand-border"
                >
                  <img src={imagemPreview} alt="Preview" className="w-full max-h-80 object-cover" />
                  <button
                    onClick={removerImagem}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  onClick={() => inputImagemRef.current?.click()}
                  className="w-full border-2 border-dashed border-brand-border hover:border-brand-green/50 rounded-xl p-8 flex flex-col items-center gap-2 text-brand-muted hover:text-brand-green transition-all group"
                >
                  <ImagePlus size={28} className="group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium">Clique para adicionar uma imagem</p>
                  <p className="text-xs">PNG, JPG, WebP até 5MB</p>
                </motion.button>
              )}
            </AnimatePresence>

            <input
              ref={inputImagemRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImagemSelecionada}
              className="hidden"
            />
          </div>

          {/* Gravador de Áudio */}
          <div>
            <label className="block text-sm text-brand-muted mb-2">
              Áudio <span className="text-brand-muted/60">(opcional · máx 2 min)</span>
            </label>
            {audioPreviewUrl ? (
              <div className="space-y-2">
                <AudioPlayer url={audioPreviewUrl} />
                <button onClick={() => { setAudioFile(null); setAudioPreviewUrl(null) }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={12} /> Remover áudio
                </button>
              </div>
            ) : mostrarGravador ? (
              <AudioRecorder
                onAudioPronto={(file, url) => { setAudioFile(file); setAudioPreviewUrl(url); setMostrarGravador(false) }}
                onCancelar={() => setMostrarGravador(false)}
              />
            ) : (
              <button onClick={() => setMostrarGravador(true)}
                className="w-full border-2 border-dashed border-brand-border hover:border-brand-green/50 rounded-xl p-5 flex items-center justify-center gap-2 text-brand-muted hover:text-brand-green transition-all group"
              >
                <Mic size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Gravar áudio</span>
              </button>
            )}
          </div>

          <button onClick={handlePublicar} disabled={carregando || uploadando} className="btn-primary w-full">
            {carregando || uploadando
              ? <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  {uploadando ? 'Enviando imagem...' : 'Publicando...'}
                </span>
              : 'Publicar 🚀'
            }
          </button>
        </motion.div>
      )}
    </div>
  )
}
