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

if (!getApps().length) {
  initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID }
      : { credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID }
  )
}

const db = getFirestore()
const app = express()
app.use(cors())
app.use(express.json())

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY?.trim() || ''
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

const priceCache: Record<string, { currentPrice: number; change24h: number }> = {}
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
  priceCache.TSLA = { currentPrice: result.price, change24h: result.change }
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

  // Fetch cryptos (Finnhub if key present, otherwise CoinGecko)
  for (const sym of Object.keys(CRYPTO_MAP)) {
    const result = FINNHUB_API_KEY ? await fetchFinnhubCrypto(sym) : await fetchCoinGeckoCrypto(sym)
    if (result) {
      priceCache[sym] = { currentPrice: result.price, change24h: result.change }
    } else if (priceCache[sym]) {
      console.log(`[Poll] Using cached price for ${sym}`)
    }
    if (priceCache[sym]) {
      const ref = db.collection('assets').doc(sym)
      batch.update(ref, { currentPrice: priceCache[sym].currentPrice, change24h: priceCache[sym].change24h, updatedAt: now })
    }
  }

  // Simulate seeded assets
  for (const sym of Object.keys(SEEDED)) {
    const price = simulatePrice(sym)
    const prev = priceCache[sym]?.currentPrice || SEEDED[sym].price
    const change = parseFloat(((price - prev) / prev * 100).toFixed(3))
    priceCache[sym] = { currentPrice: price, change24h: change }
    const ref = db.collection('assets').doc(sym)
    batch.update(ref, { currentPrice: price, change24h: change, updatedAt: now })
  }

  try {
    await batch.commit()
    lastUpdate = ts
    console.log(`[${ts}] Prices updated`)
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`)
  console.log(`[Server] Starting initial price poll...`)
  void pollPrices()
  void refreshPriceHistory()
})
