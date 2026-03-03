'use client'

import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ASSET_CLASSE_COLORS, ASSET_CLASSE_LABELS, type AssetClasse } from '@/types'

type Asset = {
  classe:     AssetClasse
  nome:       string
  percentual: number
}

type Props = {
  assets: Asset[]
}

type CustomTooltipProps = {
  active?:  boolean
  payload?: Array<{ name: string; value: number; payload: Asset }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-3 shadow-xl">
      <p className="text-white font-semibold text-sm">{d.nome}</p>
      <p className="text-brand-muted text-xs">{ASSET_CLASSE_LABELS[d.classe]}</p>
      <p className="text-brand-green font-bold mt-1">{d.percentual.toFixed(1)}%</p>
    </div>
  )
}

// Agrupa por classe para o gráfico principal
function agruparPorClasse(assets: Asset[]) {
  const mapa: Record<string, { classe: AssetClasse; nome: string; percentual: number }> = {}
  assets.forEach((a) => {
    if (mapa[a.classe]) {
      mapa[a.classe].percentual += a.percentual
    } else {
      mapa[a.classe] = {
        classe:     a.classe,
        nome:       ASSET_CLASSE_LABELS[a.classe],
        percentual: a.percentual,
      }
    }
  })
  return Object.values(mapa)
}

export function CarteiraChart({ assets }: Props) {
  const dados = agruparPorClasse(assets).filter((d) => d.percentual > 0)

  if (dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-brand-muted text-sm">
        Nenhum ativo cadastrado
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <RechartsPie>
          <Pie
            data={dados}
            dataKey="percentual"
            nameKey="nome"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            strokeWidth={0}
          >
            {dados.map((entry) => (
              <Cell
                key={entry.classe}
                fill={ASSET_CLASSE_COLORS[entry.classe]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-300">{value}</span>
            )}
          />
        </RechartsPie>
      </ResponsiveContainer>

      {/* Legenda detalhada */}
      <div className="space-y-2 mt-4">
        {dados.map((d) => (
          <div key={d.classe} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ background: ASSET_CLASSE_COLORS[d.classe] }}
              />
              <span className="text-sm text-gray-300">{d.nome}</span>
            </div>
            <span className="text-sm font-semibold text-white">{d.percentual.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
