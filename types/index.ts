// ============================================================
// INVESTAGRAM - Tipos TypeScript Globais
// ============================================================

export type Profile = {
  id: string
  username: string
  nome: string
  foto_url?: string | null
  bio?: string | null
  idade?: number | null
  pais?: string | null
  created_at: string
  // Contadores opcionais (via join ou RPC)
  total_posts?: number
  total_seguidores?: number
  total_seguindo?: number
  ja_sigo?: boolean
}

export type Post = {
  id: string
  user_id: string
  tipo: 'movimentacao' | 'tese'
  subtipo?: 'compra' | 'venda' | null
  ativo_nome?: string | null
  ativo_classe?: AssetClasse | null
  conteudo?: string | null
  data_operacao?: string | null
  score_relevancia: number
  created_at: string
  // Relações via join
  profiles?: Profile
  _count_likes?: number
  _count_comments?: number
  ja_curtiu?: boolean
}

export type Like = {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export type Comment = {
  id: string
  user_id: string
  post_id: string
  conteudo: string
  created_at: string
  profiles?: Profile
}

export type Follower = {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export type Portfolio = {
  id: string
  user_id: string
  mostrar_valores: boolean
  updated_at: string
  assets?: PortfolioAsset[]
}

export type PortfolioAsset = {
  id: string
  portfolio_id: string
  classe: AssetClasse
  nome: string
  ticker?: string | null
  percentual: number
  valor_absoluto?: number | null
  updated_at: string
}

export type AssetClasse =
  | 'cripto'
  | 'acao_br'
  | 'acao_eua'
  | 'etf'
  | 'fii'
  | 'renda_fixa'
  | 'dolar'
  | 'futuros'
  | 'moedas'
  | 'outros'

export const ASSET_CLASSE_LABELS: Record<AssetClasse, string> = {
  cripto:     'Criptomoedas',
  acao_br:    'Ações Brasileiras',
  acao_eua:   'Ações Americanas',
  etf:        'ETFs',
  fii:        'Fundos Imobiliários',
  renda_fixa: 'Renda Fixa',
  dolar:      'Dólar / Câmbio',
  futuros:    'Futuros',
  moedas:     'Outras Moedas',
  outros:     'Outros',
}

export const ASSET_CLASSE_COLORS: Record<AssetClasse, string> = {
  cripto:     '#00C896',
  acao_br:    '#2563EB',
  acao_eua:   '#F59E0B',
  etf:        '#7C3AED',
  fii:        '#0EA5E9',
  renda_fixa: '#6B7280',
  dolar:      '#059669',
  futuros:    '#EF4444',
  moedas:     '#EC4899',
  outros:     '#9CA3AF',
}

export type Cotacao = {
  preco: number
  variacao: number
  simbolo: string
  nome: string
}

export type CotacoesData = {
  BTC:   Cotacao
  ETH:   Cotacao
  IBOV:  Cotacao
  SP500: Cotacao
  DOLAR: Cotacao
  PETR4: Cotacao
  AAPL:  Cotacao
  timestamp: string
}

export type FeedItem = Post & {
  profiles: Profile
  _count_likes: number
  _count_comments: number
  ja_curtiu: boolean
}
