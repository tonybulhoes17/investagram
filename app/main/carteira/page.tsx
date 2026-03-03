'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, ChevronDown, PieChart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CarteiraChart } from '@/components/carteira/PieChart'
import { ASSET_CLASSE_LABELS, ASSET_CLASSE_COLORS, type AssetClasse, type PortfolioAsset } from '@/types'
import toast from 'react-hot-toast'

const CLASSES = Object.entries(ASSET_CLASSE_LABELS) as [AssetClasse, string][]

type AssetForm = {
  id?:    string
  classe: AssetClasse
  nome:   string
  ticker: string
  valor:  string   // valor em reais — base do cálculo
}

const ATIVO_VAZIO: AssetForm = {
  classe: 'acao_br',
  nome:   '',
  ticker: '',
  valor:  '',
}

function calcularPercentuais(assets: AssetForm[]) {
  const total = assets.reduce((s, a) => s + (parseFloat(a.valor) || 0), 0)
  if (total === 0) return assets.map(() => 0)
  return assets.map((a) => {
    const v = parseFloat(a.valor) || 0
    return parseFloat(((v / total) * 100).toFixed(2))
  })
}

function formatarBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CarteiraPage() {
  const { user } = useAuth()

  const [assets,      setAssets]      = useState<AssetForm[]>([{ ...ATIVO_VAZIO }])
  const [portfolioId, setPortfolioId] = useState<string | null>(null)
  const [carregando,  setCarregando]  = useState(true)
  const [salvando,    setSalvando]    = useState(false)

  const percentuais  = calcularPercentuais(assets)
  const totalValor   = assets.reduce((s, a) => s + (parseFloat(a.valor) || 0), 0)
  const assetsValidos = assets.filter((a, i) => a.nome.trim() && (parseFloat(a.valor) || 0) > 0)

  useEffect(() => {
    if (user) carregarCarteira()
  }, [user])

  const carregarCarteira = async () => {
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('*, portfolio_assets(*)')
      .eq('user_id', user!.id)
      .single()

    if (portfolio?.portfolio_assets?.length > 0) {
      setPortfolioId(portfolio.id)
      const loaded: AssetForm[] = portfolio.portfolio_assets.map((a: PortfolioAsset) => ({
        id:     a.id,
        classe: a.classe as AssetClasse,
        nome:   a.nome,
        ticker: a.ticker ?? '',
        valor:  a.valor_absoluto ? String(a.valor_absoluto) : '',
      }))
      setAssets(loaded)
    } else {
      setAssets([{ ...ATIVO_VAZIO }])
    }
    setCarregando(false)
  }

  const adicionarAtivo  = () => setAssets((prev) => [...prev, { ...ATIVO_VAZIO }])
  const removerAtivo    = (idx: number) => setAssets((prev) => prev.filter((_, i) => i !== idx))
  const atualizar       = (idx: number, campo: keyof AssetForm, valor: string) =>
    setAssets((prev) => prev.map((a, i) => i === idx ? { ...a, [campo]: valor } : a))

  const salvar = async () => {
    if (!user) return

    const validos = assets.filter((a) => a.nome.trim() && (parseFloat(a.valor) || 0) > 0)
    if (validos.length === 0) {
      toast.error('Adicione pelo menos um ativo com valor')
      return
    }

    setSalvando(true)

    let pId = portfolioId
    if (!pId) {
      const { data } = await supabase
        .from('portfolios')
        .insert({ user_id: user.id, mostrar_valores: false })
        .select().single()
      pId = data?.id
      setPortfolioId(pId ?? null)
    } else {
      await supabase.from('portfolios').update({ updated_at: new Date().toISOString() }).eq('id', pId)
    }

    if (!pId) { setSalvando(false); toast.error('Erro ao criar carteira'); return }

    // Recalcula percentuais na hora de salvar
    const total = validos.reduce((s, a) => s + (parseFloat(a.valor) || 0), 0)

    await supabase.from('portfolio_assets').delete().eq('portfolio_id', pId)

    await supabase.from('portfolio_assets').insert(
      validos.map((a) => {
        const v = parseFloat(a.valor) || 0
        return {
          portfolio_id:   pId,
          classe:         a.classe,
          nome:           a.nome.trim(),
          ticker:         a.ticker.trim() || null,
          percentual:     parseFloat(((v / total) * 100).toFixed(2)),
          valor_absoluto: v,
        }
      })
    )

    setSalvando(false)
    toast.success('Carteira salva! 📊')
    carregarCarteira()
  }

  // Preview para o gráfico (só ativos válidos)
  const previewChart = assetsValidos.map((a, i) => {
    const idx = assets.indexOf(a)
    return { classe: a.classe, nome: a.nome, percentual: percentuais[idx] }
  })

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card p-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Minha Carteira</h1>
        {totalValor > 0 && (
          <div className="text-right">
            <p className="text-xs text-brand-muted">Total investido</p>
            <p className="text-sm font-bold text-brand-green">{formatarBRL(totalValor)}</p>
          </div>
        )}
      </div>

      {/* Preview gráfico */}
      {previewChart.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={14} className="text-brand-muted" />
            <p className="text-sm text-brand-muted">Distribuição da carteira</p>
          </div>
          <CarteiraChart assets={previewChart} />
        </div>
      )}

      {/* Lista de ativos */}
      <div className="space-y-3">
        <p className="text-xs text-brand-muted uppercase tracking-wide font-semibold">
          Ativos ({assets.length})
        </p>

        <AnimatePresence>
          {assets.map((ativo, idx) => {
            const pct    = percentuais[idx]
            const valNum = parseFloat(ativo.valor) || 0
            const cor    = ASSET_CLASSE_COLORS[ativo.classe]

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-4"
              >
                {/* Header do ativo */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                    <span className="text-sm font-medium text-white">
                      {ativo.nome || `Ativo ${idx + 1}`}
                    </span>
                    {ativo.ticker && (
                      <span className="text-xs text-brand-muted bg-brand-surface px-1.5 py-0.5 rounded">
                        {ativo.ticker}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {valNum > 0 && (
                      <span className="text-sm font-bold text-brand-green">
                        {pct.toFixed(1)}%
                      </span>
                    )}
                    {assets.length > 1 && (
                      <button
                        onClick={() => removerAtivo(idx)}
                        className="p-1 text-brand-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de proporção */}
                {valNum > 0 && (
                  <div className="h-1 bg-brand-surface rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: cor }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}

                {/* Campos */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Classe */}
                  <div className="col-span-2">
                    <label className="text-xs text-brand-muted mb-1 block">Classe</label>
                    <div className="relative">
                      <select
                        value={ativo.classe}
                        onChange={(e) => atualizar(idx, 'classe', e.target.value)}
                        className="input text-sm appearance-none pr-8"
                      >
                        {CLASSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="text-xs text-brand-muted mb-1 block">Nome</label>
                    <input
                      type="text"
                      value={ativo.nome}
                      onChange={(e) => atualizar(idx, 'nome', e.target.value)}
                      placeholder="Ex: Petrobras"
                      className="input text-sm"
                    />
                  </div>

                  {/* Ticker */}
                  <div>
                    <label className="text-xs text-brand-muted mb-1 block">Ticker (opcional)</label>
                    <input
                      type="text"
                      value={ativo.ticker}
                      onChange={(e) => atualizar(idx, 'ticker', e.target.value.toUpperCase())}
                      placeholder="PETR4"
                      className="input text-sm"
                    />
                  </div>

                  {/* Valor */}
                  <div className="col-span-2">
                    <label className="text-xs text-brand-muted mb-1 block">
                      Valor investido (R$)
                      <span className="ml-1 text-brand-green">← base do cálculo de %</span>
                    </label>
                    <input
                      type="number"
                      value={ativo.valor}
                      onChange={(e) => atualizar(idx, 'valor', e.target.value)}
                      placeholder="0,00"
                      min={0}
                      step={0.01}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Info sobre privacidade */}
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <span className="text-blue-400 text-lg">🔒</span>
        <p className="text-xs text-blue-300 leading-relaxed">
          Os <strong>valores em R$</strong> são privados e nunca aparecem para outros usuários.
          Apenas a <strong>proporção percentual</strong> fica visível no seu perfil público.
        </p>
      </div>

      {/* Botões */}
      <div className="flex gap-3">
        <button
          onClick={adicionarAtivo}
          className="btn-outline flex items-center gap-2 flex-1"
        >
          <Plus size={16} />
          Adicionar ativo
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          className="btn-primary flex items-center gap-2 flex-1"
        >
          {salvando
            ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
            : <Save size={16} />
          }
          Salvar carteira
        </button>
      </div>
    </div>
  )
}
