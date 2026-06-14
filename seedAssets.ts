import * as admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let serviceAccount: admin.ServiceAccount
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf-8'))
} catch {
  console.error('❌ service-account.json not found. Place it in the project root.')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const assets = [
  { symbol: 'TSLA',   name: 'Tesla Inc.',   type: 'stock',  priceSource: 'finnhub', currentPrice: 0,      change24h: 0 },
  { symbol: 'SPACEX', name: 'SpaceX',       type: 'stock',  priceSource: 'seeded',  currentPrice: 185.40, change24h: 0 },
  { symbol: 'GDAWN',  name: 'Golden Dawn',  type: 'stock',  priceSource: 'seeded',  currentPrice: 42.75,  change24h: 0 },
  { symbol: 'APG',    name: 'APG',          type: 'stock',  priceSource: 'seeded',  currentPrice: 67.20,  change24h: 0 },
  { symbol: 'BTC',    name: 'Bitcoin',      type: 'crypto', priceSource: 'finnhub', currentPrice: 0,      change24h: 0 },
  { symbol: 'ETH',    name: 'Ethereum',     type: 'crypto', priceSource: 'finnhub', currentPrice: 0,      change24h: 0 },
  { symbol: 'SOL',    name: 'Solana',       type: 'crypto', priceSource: 'finnhub', currentPrice: 0,      change24h: 0 },
  { symbol: 'BNB',    name: 'BNB',          type: 'crypto', priceSource: 'finnhub', currentPrice: 0,      change24h: 0 },
  { symbol: 'USDT',   name: 'Tether',       type: 'crypto', priceSource: 'seeded',  currentPrice: 1.00,   change24h: 0 },
]

const batch = db.batch()
for (const asset of assets) {
  const ref = db.collection('assets').doc(asset.symbol)
  const { symbol, ...rest } = asset
  batch.set(ref, { ...rest, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
}

await batch.commit()
console.log('✅ Seeded 9 assets')
process.exit(0)
