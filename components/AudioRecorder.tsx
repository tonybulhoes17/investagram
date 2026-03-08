'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onAudioPronto: (file: File, url: string) => void
  onCancelar:    () => void
}

export function AudioRecorder({ onAudioPronto, onCancelar }: Props) {
  const [gravando,     setGravando]     = useState(false)
  const [pausado,      setPausado]      = useState(false)
  const [temAudio,     setTemAudio]     = useState(false)
  const [tocando,      setTocando]      = useState(false)
  const [tempo,        setTempo]        = useState(0)
  const [tempoBarra,   setTempoBarra]   = useState(0)
  const [duracao,      setDuracao]      = useState(0)
  const [ondas,        setOndas]        = useState<number[]>(Array(40).fill(2))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef      = useRef<string | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)
  const intervalRef      = useRef<NodeJS.Timeout | null>(null)
  const analyserRef      = useRef<AnalyserNode | null>(null)
  const animFrameRef     = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current)  clearInterval(intervalRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioUrlRef.current)  URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Visualizador de ondas
      const ctx      = new AudioContext()
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const desenharOndas = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const novasOndas = Array(40).fill(0).map((_, i) => {
          const idx = Math.floor(i * data.length / 40)
          return Math.max(2, (data[idx] / 255) * 40)
        })
        setOndas(novasOndas)
        animFrameRef.current = requestAnimationFrame(desenharOndas)
      }
      desenharOndas()

      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        audioBlobRef.current = blob
        const url = URL.createObjectURL(blob)
        audioUrlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onloadedmetadata = () => setDuracao(Math.round(audio.duration))
        audio.onended = () => { setTocando(false); setTempoBarra(0) }
        setTemAudio(true)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        setOndas(Array(40).fill(2))
        stream.getTracks().forEach(t => t.stop())
      }

      mr.start()
      mediaRecorderRef.current = mr
      setGravando(true)
      setTempo(0)
      intervalRef.current = setInterval(() => {
        setTempo(t => {
          if (t >= 120) { pararGravacao(); return t }
          return t + 1
        })
      }, 1000)
    } catch {
      alert('Permita o acesso ao microfone para gravar áudio.')
    }
  }

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop()
    if (intervalRef.current) clearInterval(intervalRef.current)
    setGravando(false)
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (tocando) {
      audioRef.current.pause()
      setTocando(false)
    } else {
      audioRef.current.play()
      setTocando(true)
      const atualizarBarra = () => {
        if (!audioRef.current) return
        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100
        setTempoBarra(pct)
        if (!audioRef.current.ended) requestAnimationFrame(atualizarBarra)
      }
      requestAnimationFrame(atualizarBarra)
    }
  }

  const descartar = () => {
    audioRef.current?.pause()
    setTemAudio(false)
    setGravando(false)
    setTempo(0)
    setTempoBarra(0)
    setOndas(Array(40).fill(2))
    onCancelar()
  }

  const confirmar = () => {
    if (!audioBlobRef.current || !audioUrlRef.current) return
    const file = new File([audioBlobRef.current], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
    onAudioPronto(file, audioUrlRef.current)
  }

  const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brand-surface border border-brand-border rounded-2xl p-4"
    >
      {/* Estado: gravando */}
      {gravando && (
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-3 h-3 bg-red-500 rounded-full shrink-0"
          />
          <div className="flex items-end gap-0.5 flex-1 h-8">
            {ondas.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: h }}
                transition={{ duration: 0.1 }}
                className="flex-1 bg-brand-green rounded-full"
                style={{ minHeight: 2 }}
              />
            ))}
          </div>
          <span className="text-xs text-red-400 font-mono shrink-0">{formatarTempo(tempo)}</span>
          <button onClick={pararGravacao}
            className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors shrink-0"
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      )}

      {/* Estado: áudio gravado */}
      {temAudio && !gravando && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}
              className="w-9 h-9 bg-brand-green text-brand-dark rounded-full flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
            >
              {tocando ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>

            {/* Barra de progresso */}
            <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-green rounded-full"
                style={{ width: `${tempoBarra}%` }}
              />
            </div>

            <span className="text-xs text-brand-muted font-mono shrink-0">{formatarTempo(duracao)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={descartar}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <Trash2 size={12} /> Descartar
            </button>
            <button onClick={confirmar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-brand-green text-brand-dark font-bold rounded-xl hover:opacity-90 transition-opacity ml-auto"
            >
              <Send size={12} /> Usar este áudio
            </button>
          </div>
        </div>
      )}

      {/* Estado: inicial */}
      {!gravando && !temAudio && (
        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm text-brand-muted">Toque para gravar (máx 2 min)</div>
          <button onClick={iniciarGravacao}
            className="w-10 h-10 bg-brand-green text-brand-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Mic size={16} />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ── Player de áudio para exibição no feed ───────────────────
export function AudioPlayer({ url }: { url: string }) {
  const [tocando,    setTocando]    = useState(false)
  const [progresso,  setProgresso]  = useState(0)
  const [duracao,    setDuracao]    = useState(0)
  const [tempoAtual, setTempoAtual] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onloadedmetadata = () => setDuracao(Math.round(audio.duration))
    audio.ontimeupdate = () => {
      setTempoAtual(Math.round(audio.currentTime))
      setProgresso((audio.currentTime / audio.duration) * 100)
    }
    audio.onended = () => { setTocando(false); setProgresso(0); setTempoAtual(0) }
    return () => { audio.pause(); audio.src = '' }
  }, [url])

  const toggle = () => {
    if (!audioRef.current) return
    if (tocando) { audioRef.current.pause(); setTocando(false) }
    else         { audioRef.current.play();  setTocando(true)  }
  }

  const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 bg-brand-surface border border-brand-border rounded-2xl px-4 py-3 my-2">
      <button onClick={toggle}
        className="w-9 h-9 bg-brand-green text-brand-dark rounded-full flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
      >
        {tocando ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>

      <div className="flex-1">
        <div className="h-1.5 bg-brand-border rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current) return
            const rect = e.currentTarget.getBoundingClientRect()
            const pct  = (e.clientX - rect.left) / rect.width
            audioRef.current.currentTime = pct * audioRef.current.duration
          }}
        >
          <motion.div className="h-full bg-brand-green rounded-full" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <span className="text-xs text-brand-muted font-mono shrink-0">
        {tocando ? formatarTempo(tempoAtual) : formatarTempo(duracao)}
      </span>

      <div className="flex items-end gap-px shrink-0">
        {[3,5,4,6,3,5,4,3,5,4].map((h, i) => (
          <div key={i} className={cn('w-0.5 rounded-full transition-colors', tocando ? 'bg-brand-green' : 'bg-brand-border')}
            style={{ height: h * (tocando ? 1 : 0.6) }}
          />
        ))}
      </div>
    </div>
  )
}
