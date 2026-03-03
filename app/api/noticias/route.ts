// ============================================================
// INVESTAGRAM - API Route: Notícias em Tempo Real
// Fontes: Google News RSS, InfoMoney, CoinDesk, CoinTelegraph
// Cache de 5 minutos
// ============================================================

import { NextResponse } from 'next/server'

export type Noticia = {
  id:        string
  titulo:    string
  resumo:    string
  url:       string
  fonte:     string
  fonte_url: string
  imagem?:   string
  categoria: 'cripto' | 'acoes' | 'economia' | 'global'
  publicado: string // ISO string
}

type CacheEntry = { data: Noticia[]; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// ── Fontes RSS ──────────────────────────────────────────────
const FEEDS: { url: string; fonte: string; fonte_url: string; categoria: Noticia['categoria'] }[] = [
  {
    url:       'https://news.google.com/rss/search?q=PETR4+ações+bolsa&hl=pt-BR&gl=BR&ceid=BR:pt',
    fonte:     'Google News',
    fonte_url: 'https://news.google.com',
    categoria: 'acoes',
  },
  {
    url:       'https://news.google.com/rss/search?q=IBOVESPA+bolsa+brasil&hl=pt-BR&gl=BR&ceid=BR:pt',
    fonte:     'Google News',
    fonte_url: 'https://news.google.com',
    categoria: 'acoes',
  },
  {
    url:       'https://news.google.com/rss/search?q=bitcoin+criptomoeda&hl=pt-BR&gl=BR&ceid=BR:pt',
    fonte:     'Google News',
    fonte_url: 'https://news.google.com',
    categoria: 'cripto',
  },
  {
    url:       'https://news.google.com/rss/search?q=investimento+economia+brasil&hl=pt-BR&gl=BR&ceid=BR:pt',
    fonte:     'Google News',
    fonte_url: 'https://news.google.com',
    categoria: 'economia',
  },
  {
    url:       'https://www.infomoney.com.br/feed/',
    fonte:     'InfoMoney',
    fonte_url: 'https://www.infomoney.com.br',
    categoria: 'economia',
  },
  {
    url:       'https://cointelegraph.com/rss',
    fonte:     'CoinTelegraph',
    fonte_url: 'https://cointelegraph.com',
    categoria: 'cripto',
  },
  {
    url:       'https://www.coindesk.com/arc/outboundfeeds/rss/',
    fonte:     'CoinDesk',
    fonte_url: 'https://www.coindesk.com',
    categoria: 'cripto',
  },
]

// ── Parser de RSS simples (sem dependências) ─────────────────
function extrairTexto(xml: string, tag: string): string {
  // Tenta com CDATA primeiro
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdataMatch) return cdataMatch[1].trim()

  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return ''

  // Remove tags HTML restantes
  return match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
}

function extrairImagem(itemXml: string): string | undefined {
  // Tenta media:content
  const media = itemXml.match(/media:content[^>]+url=["']([^"']+)["']/i)
  if (media) return media[1]

  // Tenta enclosure
  const enclosure = itemXml.match(/enclosure[^>]+url=["']([^"']+)["']/i)
  if (enclosure) return enclosure[1]

  // Tenta img dentro de description
  const img = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (img) return img[1]

  return undefined
}

function parsearRSS(xml: string, fonte: string, fonte_url: string, categoria: Noticia['categoria']): Noticia[] {
  const noticias: Noticia[] = []

  // Extrai todos os <item>
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []

  for (const item of itemMatches.slice(0, 5)) { // máximo 5 por feed
    const titulo   = extrairTexto(item, 'title')
    const url      = extrairTexto(item, 'link') || extrairTexto(item, 'guid')
    const resumo   = extrairTexto(item, 'description').slice(0, 200)
    const pubDate  = extrairTexto(item, 'pubDate')
    const imagem   = extrairImagem(item)

    if (!titulo || !url) continue

    // Gera ID único baseado na URL
    const id = Buffer.from(url).toString('base64').slice(0, 20)

    let publicado: string
    try {
      publicado = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
    } catch {
      publicado = new Date().toISOString()
    }

    noticias.push({ id, titulo, resumo, url, fonte, fonte_url, imagem, categoria, publicado })
  }

  return noticias
}

async function buscarFeed(feed: typeof FEEDS[0]): Promise<Noticia[]> {
  try {
    const res = await fetch(feed.url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Investagram/1.0 RSS Reader' },
      signal: AbortSignal.timeout(5000), // timeout 5s
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parsearRSS(xml, feed.fonte, feed.fonte_url, feed.categoria)
  } catch {
    return []
  }
}

function deduplicar(noticias: Noticia[]): Noticia[] {
  const vistos = new Set<string>()
  return noticias.filter((n) => {
    const key = n.titulo.slice(0, 60).toLowerCase()
    if (vistos.has(key)) return false
    vistos.add(key)
    return true
  })
}

export async function GET() {
  // Retorna cache se ainda válido
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    // Busca todos os feeds em paralelo
    const resultados = await Promise.all(FEEDS.map(buscarFeed))

    const todas = resultados.flat()

    // Deduplica e ordena por data (mais recente primeiro)
    const unicas = deduplicar(todas).sort(
      (a, b) => new Date(b.publicado).getTime() - new Date(a.publicado).getTime()
    )

    // Limita a 30 notícias
    const top30 = unicas.slice(0, 30)

    cache = { data: top30, timestamp: Date.now() }
    return NextResponse.json(top30)

  } catch (err) {
    console.error('Erro ao buscar notícias:', err)
    if (cache) return NextResponse.json(cache.data)
    return NextResponse.json([], { status: 200 })
  }
}
