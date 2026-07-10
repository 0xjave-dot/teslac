import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { initializeApp, applicationDefault, cert, apps } from 'firebase-admin/app'
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

if (!apps.length) {
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

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ''
const FINNHUB_STOCKS = ['TSLA']
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

async function fetchFinnhubStock(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
    if (!res.ok) { console.error(`[Finnhub] HTTP ${res.status} for ${symbol}`); return null }
    const data = await res.json() as { c: number; dp: number }
    if (!data.c) return null
    return { price: data.c, change: data.dp || 0 }
  } catch (e) {
    console.error(`[Finnhub] Error fetching ${symbol}:`, e)
    return null
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
  const batch = db.batch()
  const now = FieldValue.serverTimestamp()
  const ts = new Date().toISOString()

  // Fetch stocks (Finnhub if key present, otherwise Nasdaq public API)
  for (const sym of FINNHUB_STOCKS) {
    const result = FINNHUB_API_KEY ? await fetchFinnhubStock(sym) : await fetchNasdaqStock(sym)
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
  }
}

// Schedule price polling every 10 seconds
cron.schedule('*/10 * * * * *', pollPrices)

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
  pollPrices()
})
