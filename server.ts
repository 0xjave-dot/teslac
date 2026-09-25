import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Initialize Firebase Admin
let serviceAccount: any | undefined
try {
  const saPath = join(__dirname, 'service-account.json')
  serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'))
} catch {
  console.log('[Server] No service-account.json found — using Application Default Credentials')
}

const projectId = process.env.FIREBASE_PROJECT_ID || 'tesla-3863b'

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount), projectId })
  } else {
    try {
      initializeApp({ credential: applicationDefault(), projectId })
    } catch {
      console.log('[Server] Application Default Credentials failed. Initializing with Project ID only.')
      initializeApp({ projectId })
    }
  }
}

const db = getFirestore()
const app = express()
app.use(cors())
app.use(express.json())

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY?.trim() || ''
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY || ''
const FREECRYPTO_API_KEY = process.env.FREECRYPTO_API_KEY || ''
const FIRESTORE_WRITE_ENABLED = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT)
const FINNHUB_STOCKS = ['TSLA']
const HISTORY_REFRESH_MS = 6 * 60 * 60 * 1000
const STOCK_HISTORY = [
  { resolution: '1m', providerResolution: '1', durationMs: 24 * 60 * 60 * 1000 },
  { resolution: '5m', providerResolution: '5', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { resolution: '15m', providerResolution: '15', durationMs: 30 * 24 * 60 * 60 * 1000 },
] as const
const CRYPTO_MAP: Record<string, string> = {
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT',
  BNB: 'BINANCE:BNBUSDT',
}

const SEEDED: Record<string, { name: string; price: number; type: string; seed: number }> = {
  SPACEX: { name: 'SpaceX', price: 185.40, type: 'stock', seed: 185.40 },
  GDAWN:  { name: 'Golden Dawn', price: 42.75, type: 'stock', seed: 42.75 },
  APG:    { name: 'APG', price: 67.20, type: 'stock', seed: 67.20 },
  USDT:   { name: 'Tether', price: 1.00, type: 'crypto', seed: 1.00 },
}

const priceCache: Record<string, {
  currentPrice: number
  change24h: number
  priceStatus?: 'live' | 'error'
  priceSource?: 'finnhub' | 'seeded'
  priceUpdatedAt?: number
  priceError?: string | null
}> = {}
let lastUpdate = ''
let polling = false

async function fetchFinnhubStock(symbol: string): Promise<{ price: number; change: number }> {
  if (!FINNHUB_API_KEY) throw new Error('FINNHUB_API_KEY is not configured on the price server.')

  const url = new URL('https://finnhub.io/api/v1/quote')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('token', FINNHUB_API_KEY)
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Finnhub quote request failed (HTTP ${res.status}).`)

  const data = await res.json() as { c?: number; dp?: number }
  if (!Number.isFinite(data.c) || (data.c ?? 0) <= 0) {
    throw new Error('Finnhub returned no current quote for TSLA.')
  }
  return { price: data.c as number, change: Number.isFinite(data.dp) ? data.dp as number : 0 }
}

async function updateTslaPrice() {
  const ref = db.collection('assets').doc('TSLA')
  let result: { price: number; change: number }

  try {
    result = await fetchFinnhubStock('TSLA')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Finnhub quote request failed.'
    console.error(`[Finnhub] TSLA quote unavailable: ${message}`)
    try {
      await ref.set({
        priceSource: 'finnhub',
        priceStatus: 'error',
        priceError: message,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    } catch (firestoreError) {
      console.error('[Firestore] Could not record TSLA quote error:', firestoreError)
    }
    return
  }

  const sampledAt = Date.now()
  priceCache.TSLA = {
    currentPrice: result.price,
    change24h: result.change,
    priceStatus: 'live',
    priceSource: 'finnhub',
    priceUpdatedAt: sampledAt,
    priceError: null,
  }
  try {
    await ref.set({
      currentPrice: result.price,
      change24h: result.change,
      priceSource: 'finnhub',
      priceStatus: 'live',
      priceError: null,
      priceUpdatedAt: sampledAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  } catch (error) {
    console.error('[Firestore] Could not save TSLA quote:', error)
  }
}

async function fetchFinnhubCandles(
  providerResolution: string,
  from: number,
  to: number
): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
  if (!FINNHUB_API_KEY) throw new Error('FINNHUB_API_KEY is not configured on the price server.')

  const url = new URL('https://finnhub.io/api/v1/stock/candle')
  url.searchParams.set('symbol', 'TSLA')
  url.searchParams.set('resolution', providerResolution)
  url.searchParams.set('from', String(from))
  url.searchParams.set('to', String(to))
  url.searchParams.set('token', FINNHUB_API_KEY)

  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`Finnhub candle request failed (HTTP ${res.status}).`)
  const data = await res.json() as {
    s?: string
    t?: number[]
    o?: number[]
    h?: number[]
    l?: number[]
    c?: number[]
    v?: number[]
  }
  if (data.s !== 'ok' || !data.t?.length || !data.o || !data.h || !data.l || !data.c) {
    throw new Error('Finnhub returned no historical candles for TSLA.')
  }

  return data.t.flatMap((time, index) => {
    const open = data.o?.[index]
    const high = data.h?.[index]
    const low = data.l?.[index]
    const close = data.c?.[index]
    const volume = data.v?.[index]
    if (![time, open, high, low, close].every(Number.isFinite)) return []
    return [{
      time: time * 1000,
      open: open as number,
      high: high as number,
      low: low as number,
      close: close as number,
      volume: Number.isFinite(volume) ? volume as number : 0,
    }]
  })
}

async function refreshPriceHistory() {
  const assetRef = db.collection('assets').doc('TSLA')
  try {
    await assetRef.set({ historyStatus: 'loading', historyError: null }, { merge: true })
    const now = Math.floor(Date.now() / 1000)

    for (const config of STOCK_HISTORY) {
      const from = now - Math.floor(config.durationMs / 1000)
      const candles = await fetchFinnhubCandles(config.providerResolution, from, now)
      const collectionRef = db.collection('priceHistory').doc('TSLA').collection(config.resolution)

      for (let offset = 0; offset < candles.length; offset += 400) {
        const batch = db.batch()
        candles.slice(offset, offset + 400).forEach((candle) => {
          batch.set(collectionRef.doc(String(candle.time)), candle)
        })
        await batch.commit()
      }
    }

    await assetRef.set({
      historyStatus: 'ready',
      historyError: null,
      historyUpdatedAt: Date.now(),
    }, { merge: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Historical TSLA prices could not be refreshed.'
    console.error(`[Finnhub] TSLA chart history unavailable: ${message}`)
    try {
      await assetRef.set({ historyStatus: 'error', historyError: message }, { merge: true })
    } catch (firestoreError) {
      console.error('[Firestore] Could not record TSLA history error:', firestoreError)
    }
  }
}

async function fetchFinnhubCrypto(symbol: string): Promise<{ price: number; change: number } | null> {
  const binanceSym = CRYPTO_MAP[symbol]
  if (!binanceSym) return null
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${binanceSym}&token=${FINNHUB_API_KEY}`)
    if (!res.ok) { console.error(`[Finnhub] HTTP ${res.status} for ${symbol}`); return null }
    const data = await res.json() as { c: number; dp: number }
    if (!data.c) return null
    return { price: data.c, change: data.dp || 0 }
  } catch (e) {
    console.error(`[Finnhub] Error fetching crypto ${symbol}:`, e)
    return null
  }
}

async function fetchCoinGeckoCrypto(symbol: string): Promise<{ price: number; change: number } | null> {
  const idMap: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin' }
  const id = idMap[symbol]
  if (!id) return null
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) { console.error(`[Coingecko] HTTP ${res.status} for ${symbol}`); return null }
    const data = await res.json() as any
    const entry = data[id]
    if (!entry || typeof entry.usd !== 'number') return null
    const price = entry.usd
    const change = typeof entry.usd_24h_change === 'number' ? entry.usd_24h_change : 0
    return { price, change }
  } catch (e) {
    console.error(`[Coingecko] Error fetching crypto ${symbol}:`, e)
    return null
  }
}

async function fetchFreeCrypto(symbol: string): Promise<{ price: number; change: number } | null> {
  if (!FREECRYPTO_API_KEY) return null
  try {
    const url = `https://api.freecryptoapi.com/v1/getData?symbol=${encodeURIComponent(symbol)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${FREECRYPTO_API_KEY}` } })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[FreeCryptoAPI] HTTP ${res.status} for ${symbol}: ${text.slice(0, 200)}`)
      return null
    }
    const data = await res.json() as any
    const maybe = data?.symbols?.[0] || data?.result || data?.data || data
    const price = maybe?.last || maybe?.price || maybe?.close || maybe?.last_price || maybe?.currentPrice
    const change = maybe?.daily_change_percentage || maybe?.change24h || maybe?.percent_change_24h || 0
    if (price == null || Number.isNaN(Number(price))) return null
    return { price: Number(price), change: Number(change || 0) }
  } catch (e) {
    console.error(`[FreeCryptoAPI] Error fetching ${symbol}:`, e)
    return null
  }
}

async function fetchMassiveStock(symbol: string): Promise<{ price: number; change: number } | null> {
  if (!MASSIVE_API_KEY) return null
  const candidates = [
    `https://api.massive.com/v2/last/nbbo/${encodeURIComponent(symbol)}`,
    `https://api.massive.com/v2/last/nbbo/${encodeURIComponent(symbol)}?apiKey=${encodeURIComponent(MASSIVE_API_KEY)}`,
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${MASSIVE_API_KEY}`, Accept: 'application/json' } })
      if (!res.ok) {
        const text = await res.text()
        console.error(`[Massive] HTTP ${res.status} for ${symbol} at ${url}: ${text.slice(0, 200)}`)
        continue
      }
      const data = await res.json() as any
      const maybe = data?.results || data?.ticker || data
      const price = maybe?.P || maybe?.p || maybe?.last || maybe?.close || maybe?.c || maybe?.currentPrice
      const change = maybe?.todaysChangePerc || maybe?.daily_change_percentage || maybe?.change24h || maybe?.percent_change_24h || 0
      if (price == null || Number.isNaN(Number(price))) continue
      return { price: Number(price), change: Number(change || 0) }
    } catch (e) {
      console.error(`[Massive] Error trying ${url} for ${symbol}:`, e)
      continue
    }
  }
  return null
}

async function fetchNasdaqStock(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json, text/plain, */*',
      },
    })
    if (!res.ok) { console.error(`[Nasdaq] HTTP ${res.status} for ${symbol}`); return null }
    const json = await res.json() as any
    const data = json?.data?.primaryData
    if (!data || typeof data.lastSalePrice !== 'string') return null
    const rawPrice = data.lastSalePrice.replace(/[^0-9.-]+/g, '')
    const price = parseFloat(rawPrice)
    const change = typeof data.percentageChange === 'string' ? parseFloat(data.percentageChange.replace('%', '')) : 0
    if (!Number.isFinite(price)) return null
    return { price, change: Number.isFinite(change) ? change : 0 }
  } catch (e) {
    console.error(`[Nasdaq] Error fetching stock ${symbol}:`, e)
    return null
  }
}

function simulatePrice(symbol: string): number {
  if (symbol === 'USDT') return 1.00
  const seeded = SEEDED[symbol]
  if (!seeded) return priceCache[symbol]?.currentPrice || 100
  const current = priceCache[symbol]?.currentPrice || seeded.price
  const delta = current * (Math.random() - 0.5) * 0.004
  const newPrice = current + delta
  const maxDrift = seeded.seed * 0.15
  if (Math.abs(newPrice - seeded.seed) > maxDrift) return seeded.seed
  return parseFloat(newPrice.toFixed(4))
}

async function pollPrices() {
  if (polling) return
  polling = true
  const batch = db.batch()
  const now = FieldValue.serverTimestamp()
  const ts = new Date().toISOString()

  // Only TSLA is a real listed stock in the seeded asset set.
  for (const sym of FINNHUB_STOCKS) {
    if (sym === 'TSLA') await updateTslaPrice()
  }

  // Fetch cryptos: FreeCryptoAPI only
  for (const sym of Object.keys(CRYPTO_MAP)) {
    let result = null
    if (FREECRYPTO_API_KEY) {
      result = await fetchFreeCrypto(sym)
    }
    if (!result) {
      if (!FREECRYPTO_API_KEY) {
        console.log(`[Poll] No FreeCryptoAPI key for ${sym}, skipping crypto fetch.`)
      } else {
        console.log(`[Poll] FreeCrypto fetch failed for ${sym}, using cached price if available.`)
      }
    }
    if (result) {
      priceCache[sym] = { currentPrice: result.price, change24h: result.change }
    } else if (priceCache[sym]) {
      console.log(`[Poll] Using cached price for ${sym}`)
    }
    if (priceCache[sym]) {
      const ref = db.collection('assets').doc(sym)
      batch.set(ref, {
        currentPrice: priceCache[sym].currentPrice,
        change24h: priceCache[sym].change24h,
        updatedAt: now,
      }, { merge: true })
    }
  }

  // Simulate seeded assets
  for (const sym of Object.keys(SEEDED)) {
    const price = simulatePrice(sym)
    const prev = priceCache[sym]?.currentPrice || SEEDED[sym].price
    const change = parseFloat(((price - prev) / prev * 100).toFixed(3))
    priceCache[sym] = { currentPrice: price, change24h: change }
    const ref = db.collection('assets').doc(sym)
    batch.set(ref, {
      currentPrice: price,
      change24h: change,
      updatedAt: now,
    }, { merge: true })
  }

  try {
    if (FIRESTORE_WRITE_ENABLED) {
      await batch.commit()
      lastUpdate = ts
      console.log(`[${ts}] Prices updated`)
    } else {
      console.log(`[${ts}] Prices fetched; Firestore write disabled because no service account credentials are configured.`)
    }
  } catch (e) {
    console.error('[Poll] Batch commit failed:', e)
  } finally {
    polling = false
  }
}

// Schedule price polling every 10 seconds
cron.schedule('*/10 * * * * *', () => { void pollPrices() })
setInterval(() => { void refreshPriceHistory() }, HISTORY_REFRESH_MS)

// HTTP routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), lastUpdate })
})

app.get('/prices', (_req, res) => {
  res.json(priceCache)
})

const YAHOO_MAP: Record<string, string> = {
  TSLA: 'TSLA',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
  BNB: 'BNB-USD',
  USDT: 'USDT-USD',
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateSimulatedChart(symbol: string, timeframe: string, currentPrice: number) {
  const data = []
  const now = Date.now()
  let points = 60
  let interval = 60000 // 1 min
  let vol = 0.001

  if (timeframe === '1H') {
    points = 30
    interval = 120000 // 2 min
    vol = 0.001
  } else if (timeframe === '1D') {
    points = 96
    interval = 900000 // 15 min
    vol = 0.002
  } else if (timeframe === '1W') {
    points = 168
    interval = 3600000 // 1 hour
    vol = 0.005
  } else if (timeframe === '1M') {
    points = 30
    interval = 86400000 // 1 day
    vol = 0.015
  }

  const timeKey = Math.floor(now / (interval * 5))
  let seed = 0
  for (let i = 0; i < symbol.length; i++) {
    seed += symbol.charCodeAt(i)
  }
  seed += timeKey

  let price = currentPrice || 100
  for (let i = points; i >= 0; i--) {
    const rand = seededRandom(seed - i)
    const change = (rand - 0.495) * vol
    price = price / (1 + change)
  }

  price = currentPrice || 100
  for (let i = 0; i <= points; i++) {
    const rand = seededRandom(seed - i)
    const change = (rand - 0.495) * vol
    const open = price
    price = price * (1 + change)
    const close = price

    const wickVol = vol * 1.5
    const high = Math.max(open, close) * (1 + seededRandom(seed + i) * wickVol)
    const low = Math.min(open, close) * (1 - seededRandom(seed - i - 1) * wickVol)

    const date = new Date(now - (points - i) * interval)
    let timeStr = ''
    if (timeframe === '1H' || timeframe === '1D') {
      timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (timeframe === '1W') {
      timeStr = date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' })
    } else {
      timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    data.push({
      time: timeStr,
      price: parseFloat(close.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2))
    })
  }
  return data
}

app.get('/historical/:symbol', async (req, res) => {
  const { symbol } = req.params
  const timeframe = (req.query.timeframe as string) || '1D'

  try {
    const yahooSymbol = YAHOO_MAP[symbol]
    if (!yahooSymbol) {
      const currentPrice = priceCache[symbol]?.currentPrice || SEEDED[symbol]?.price || 100
      const data = generateSimulatedChart(symbol, timeframe, currentPrice)
      return res.json(data)
    }

    let range = '1d'
    let interval = '5m'

    if (timeframe === '1H') {
      range = '1d'
      interval = '2m'
    } else if (timeframe === '1D') {
      range = '1d'
      interval = '5m'
    } else if (timeframe === '1W') {
      range = '7d'
      interval = '1h'
    } else if (timeframe === '1M') {
      range = '1mo'
      interval = '1d'
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      console.error(`[Yahoo] HTTP ${response.status} for ${symbol}`)
      const currentPrice = priceCache[symbol]?.currentPrice || 100
      const data = generateSimulatedChart(symbol, timeframe, currentPrice)
      return res.json(data)
    }

    const data = await response.json() as any
    const result = data?.chart?.result?.[0]
    if (!result) {
      throw new Error('Invalid Yahoo response format')
    }

    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0]?.close || []
    const opens = result.indicators?.quote?.[0]?.open || []
    const highs = result.indicators?.quote?.[0]?.high || []
    const lows = result.indicators?.quote?.[0]?.low || []

    const chartPoints = []
    const nowSec = Math.floor(Date.now() / 1000)
    const oneHourAgo = nowSec - 3600

    for (let i = 0; i < timestamps.length; i++) {
      const close = quotes[i]
      if (close === null || close === undefined) continue

      const open = opens[i] !== null && opens[i] !== undefined ? opens[i] : close
      const high = highs[i] !== null && highs[i] !== undefined ? highs[i] : Math.max(open, close)
      const low = lows[i] !== null && lows[i] !== undefined ? lows[i] : Math.min(open, close)

      if (timeframe === '1H' && timestamps[i] < oneHourAgo) continue

      const date = new Date(timestamps[i] * 1000)
      let timeStr = ''
      if (timeframe === '1H' || timeframe === '1D') {
        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (timeframe === '1W') {
        timeStr = date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' })
      } else {
        timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }

      chartPoints.push({
        time: timeStr,
        price: parseFloat(close.toFixed(2)),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2))
      })
    }

    res.json(chartPoints)
  } catch (error) {
    console.error(`[Historical] Error fetching ${symbol}:`, error)
    const currentPrice = priceCache[symbol]?.currentPrice || 100
    const data = generateSimulatedChart(symbol, timeframe, currentPrice)
    res.json(data)
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`)
  console.log(`[Server] FIRESTORE_WRITE_ENABLED=${FIRESTORE_WRITE_ENABLED}`)
  console.log(`[Server] MASSIVE_API_KEY=${MASSIVE_API_KEY ? 'set' : 'missing'}`)
  console.log(`[Server] FREECRYPTO_API_KEY=${FREECRYPTO_API_KEY ? 'set' : 'missing'}`)
  console.log(`[Server] Starting initial price poll...`)
  void pollPrices()
  void refreshPriceHistory()
})
