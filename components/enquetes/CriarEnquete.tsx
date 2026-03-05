'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Plus, X, Send, Clock } from 'lucide-react'
import { usePolls } from '@/hooks/usePolls'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function CriarEnquete() {
  const router = useRouter()
  const { criarPoll } = usePolls()

  const [pergunta,  setPergunta]  = useState('')
  const [opcoes,    setOpcoes]    = useState(['', ''])
  const [enviando,  setEnviando]  = useState(false)

  const adicionarOpcao = () => {
    if (opcoes.length >= 4) return
    setOpcoes([...opcoes, ''])
  }

  const removerOpcao = (i: number) => {
    if (opcoes.length <= 2) return
    setOpcoes(opcoes.filter((_, idx) => idx !== i))
  }

  const atualizarOpcao = (i: number, valor: string) => {
    const novas = [...opcoes]
    novas[i] = valor
    setOpcoes(novas)
  }

  const handleEnviar = async () => {
    if (!pergunta.trim()) { toast.error('Digite a pergunta'); return }
    const opcoesValidas = opcoes.filter((o) => o.trim())
    if (opcoesValidas.length < 2) { toast.error('Adicione pelo menos 2 opções'); return }

    setEnviando(true)
    const result = await criarPoll(pergunta.trim(), opcoesValidas)
    setEnviando(false)

    if (result) {
      toast.success('Enquete publicada! 📊')
      router.push('/main/feed')
    } else {
      toast.error('Erro ao criar enquete')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="card p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-brand-green" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Nova Enquete</h2>
            <div className="flex items-center gap-1 text-xs text-brand-muted">
              <Clock size={11} />
              <span>Válida por 48 horas</span>
            </div>
          </div>
        </div>

        {/* Pergunta */}
        <div className="mb-5">
          <label className="text-xs text-brand-muted font-medium mb-2 block">Pergunta</label>
          <textarea
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex: Você compraria PETR4 agora?"
            maxLength={200}
            rows={3}
            className="input w-full resize-none text-sm"
          />
          <p className="text-xs text-brand-muted text-right mt-1">{pergunta.length}/200</p>
        </div>

        {/* Opções */}
        <div className="mb-5">
          <label className="text-xs text-brand-muted font-medium mb-2 block">
            Opções ({opcoes.length}/4)
          </label>
          <div className="space-y-2">
            <AnimatePresence>
              {opcoes.map((opcao, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center shrink-0">
                    <span className="text-xs text-brand-muted font-bold">{i + 1}</span>
                  </div>
                  <input
                    type="text"
                    value={opcao}
                    onChange={(e) => atualizarOpcao(i, e.target.value)}
                    placeholder={`Opção ${i + 1}`}
                    maxLength={80}
                    className="input text-sm flex-1"
                  />
                  {opcoes.length > 2 && (
                    <button onClick={() => removerOpcao(i)} className="p-1.5 text-brand-muted hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {opcoes.length < 4 && (
            <button
              onClick={adicionarOpcao}
              className="mt-3 flex items-center gap-1.5 text-xs text-brand-green hover:underline"
            >
              <Plus size={13} /> Adicionar opção
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="bg-brand-surface rounded-xl p-4 mb-5 border border-brand-border/50">
          <p className="text-xs text-brand-muted mb-2">Preview</p>
          <p className="text-sm text-white font-medium mb-3">{pergunta || 'Sua pergunta aparecerá aqui...'}</p>
          <div className="space-y-2">
            {opcoes.filter((o) => o.trim()).map((opcao, i) => (
              <div key={i} className="bg-brand-card rounded-lg px-3 py-2 text-xs text-gray-300 border border-brand-border">
                {opcao}
              </div>
            ))}
          </div>
        </div>

        {/* Botão publicar */}
        <button
          onClick={handleEnviar}
          disabled={enviando || !pergunta.trim() || opcoes.filter((o) => o.trim()).length < 2}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {enviando
            ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
            : <><Send size={15} /> Publicar enquete</>
          }
        </button>
      </div>
    </div>
  )
}
