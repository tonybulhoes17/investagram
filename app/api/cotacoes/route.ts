// ============================================================
// INVESTAGRAM - API Route: Cotações em Tempo Real
// Cache de 25s para não exceder limites das APIs gratuitas
// ============================================================

import { NextResponse } from 'next/server'

type CacheEntry = { data: any; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 400_000 // s

export async function GET() {
  // Retorna cache se ainda válido
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  const token = process.env.BRAPI_TOKEN ?? 'demo'

  try {
    // Busca cripto, BR e EUA em paralelo
    const [criptoRes, brRes, spRes, aaplRes] = await Promise.all([
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true',
        { cache: 'no-store' }
      ),
      fetch(
        `https://brapi.dev/api/quote/PETR4,%5EBVSP,USDBRL=X?token=${token}`,
        { cache: 'no-store' }
      ),
      // S&P500 via brapi (usa o ticker ^GSPC)
      fetch(
        `https://brapi.dev/api/quote/%5EGSPC?token=${token}`,
        { cache: 'no-store' }
      ),
      // AAPL via brapi
      fetch(
        `https://brapi.dev/api/quote/AAPL?token=${token}`,
        { cache: 'no-store' }
      ),
    ])

    const criptoData = await criptoRes.json()
    const brData     = await brRes.json()
    const spData     = await spRes.json()
    const aaplData   = await aaplRes.json()

    const petr4 = brData.results?.find((r: any) => r.symbol === 'PETR4')
    const ibov  = brData.results?.find((r: any) => r.symbol === '^BVSP')
    const dolar = brData.results?.find((r: any) => r.symbol === 'USDBRL=X')
    const sp500 = spData.results?.[0]
    const aapl  = aaplData.results?.[0]

    const cotacoes = {
      BTC: {
        simbolo:  'BTC',
        nome:     'Bitcoin',
        preco:    criptoData.bitcoin?.brl ?? 0,
        variacao: criptoData.bitcoin?.brl_24h_change ?? 0,
      },
      ETH: {
        simbolo:  'ETH',
        nome:     'Ethereum',
        preco:    criptoData.ethereum?.brl ?? 0,
        variacao: criptoData.ethereum?.brl_24h_change ?? 0,
      },
      IBOV: {
        simbolo:  'IBOV',
        nome:     'Ibovespa',
        preco:    ibov?.regularMarketPrice ?? 0,
        variacao: ibov?.regularMarketChangePercent ?? 0,
      },
      DOLAR: {
        simbolo:  'USD',
        nome:     'Dólar',
        preco:    dolar?.regularMarketPrice ?? 0,
        variacao: dolar?.regularMarketChangePercent ?? 0,
      },
      PETR4: {
        simbolo:  'PETR4',
        nome:     'Petrobras',
        preco:    petr4?.regularMarketPrice ?? 0,
        variacao: petr4?.regularMarketChangePercent ?? 0,
      },
      SP500: {
        simbolo:  'S&P',
        nome:     'S&P 500',
        preco:    sp500?.regularMarketPrice ?? 0,
        variacao: sp500?.regularMarketChangePercent ?? 0,
      },
      AAPL: {
        simbolo:  'AAPL',
        nome:     'Apple',
        preco:    aapl?.regularMarketPrice ?? 0,
        variacao: aapl?.regularMarketChangePercent ?? 0,
      },
      timestamp: new Date().toISOString(),
    }

    cache = { data: cotacoes, timestamp: Date.now() }
    return NextResponse.json(cotacoes)
  } catch (err) {
    console.error('Erro nas APIs de cotação:', err)
    if (cache) return NextResponse.json(cache.data)
    return NextResponse.json({ error: 'Cotações indisponíveis' }, { status: 503 })
  }
}
