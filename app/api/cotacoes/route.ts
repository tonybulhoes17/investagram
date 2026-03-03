import { NextResponse } from 'next/server'

type CacheEntry = { data: any; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 250_000 // 60 segundos

async function fetchYahoo(ticker: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    return {
      preco:    meta?.regularMarketPrice ?? 0,
      variacao: meta?.regularMarketPrice && meta?.previousClose
        ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
        : 0,
    }
  } catch {
    return { preco: 0, variacao: 0 }
  }
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  const token = process.env.BRAPI_TOKEN ?? 'demo'

  try {
    const [criptoRes, brRes, aaplRes, ibov, dolar] = await Promise.all([
      // Cripto via CoinGecko (gratuito)
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true',
        { cache: 'no-store' }
      ),
      // PETR4 e S&P via brapi (funcionam no plano free)
      fetch(
        `https://brapi.dev/api/quote/PETR4,%5EGSPC?token=${token}`,
        { cache: 'no-store' }
      ),
      // AAPL via brapi
      fetch(
        `https://brapi.dev/api/quote/AAPL?token=${token}`,
        { cache: 'no-store' }
      ),
      // IBOV via Yahoo Finance (gratuito)
      fetchYahoo('%5EBVSP'),
      // Dólar via Yahoo Finance (gratuito)
      fetchYahoo('USDBRL=X'),
    ])

    const criptoData = await criptoRes.json()
    const brData     = await brRes.json()
    const aaplData   = await aaplRes.json()

    const petr4 = brData.results?.find((r: any) => r.symbol === 'PETR4')
    const sp500 = brData.results?.find((r: any) => r.symbol === '^GSPC')
    const aapl  = aaplData.results?.[0]

    const cotacoes = {
      BTC: {
        simbolo:  'BTC',
        nome:     'Bitcoin',
        preco:    criptoData.bitcoin?.brl    ?? 0,
        variacao: criptoData.bitcoin?.brl_24h_change ?? 0,
      },
      ETH: {
        simbolo:  'ETH',
        nome:     'Ethereum',
        preco:    criptoData.ethereum?.brl   ?? 0,
        variacao: criptoData.ethereum?.brl_24h_change ?? 0,
      },
      IBOV: {
        simbolo:  'IBOV',
        nome:     'Ibovespa',
        preco:    ibov.preco,
        variacao: ibov.variacao,
      },
      DOLAR: {
        simbolo:  'USD',
        nome:     'Dólar',
        preco:    dolar.preco,
        variacao: dolar.variacao,
      },
      PETR4: {
        simbolo:  'PETR4',
        nome:     'Petrobras',
        preco:    petr4?.regularMarketPrice          ?? 0,
        variacao: petr4?.regularMarketChangePercent  ?? 0,
      },
      SP500: {
        simbolo:  'S&P',
        nome:     'S&P 500',
        preco:    sp500?.regularMarketPrice         ?? 0,
        variacao: sp500?.regularMarketChangePercent ?? 0,
      },
      AAPL: {
        simbolo:  'AAPL',
        nome:     'Apple',
        preco:    aapl?.regularMarketPrice          ?? 0,
        variacao: aapl?.regularMarketChangePercent  ?? 0,
      },
      timestamp: new Date().toISOString(),
    }

    cache = { data: cotacoes, timestamp: Date.now() }
    return NextResponse.json(cotacoes)
  } catch (err) {
    console.error('Erro nas cotações:', err)
    if (cache) return NextResponse.json(cache.data)
    return NextResponse.json({ error: 'Cotações indisponíveis' }, { status: 503 })
  }
}