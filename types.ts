export interface UserDoc {
  uid: string
  name: string
  email: string
  photoURL: string
  country: string
  role: 'user' | 'admin'
  createdAt: Date | null
}

export interface Balance {
  available: number
  locked: number
  total: number
  updatedAt?: Date | null
}

export interface Asset {
  symbol: string
  name: string
  type: 'stock' | 'crypto'
  priceSource: 'finnhub' | 'seeded'
  currentPrice: number
  change24h: number
  updatedAt?: Date | null
  priceStatus?: 'live' | 'error'
  priceError?: string | null
  priceUpdatedAt?: number | null
  historyStatus?: 'ready' | 'loading' | 'error'
  historyError?: string | null
  historyUpdatedAt?: number | null
}

export type PriceResolution = '1m' | '5m' | '15m' | '60m'

export interface PriceCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Transaction {
  id: string
  userId: string
  userName: string
  type: 'deposit' | 'withdrawal'
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  note: string
  adminNote?: string
  createdAt: Date | null
  updatedAt?: Date | null
}

export interface Holding {
  symbol: string
  name: string
  type: string
  units: number
  avgBuyPrice: number
  updatedAt?: Date | null
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit'

export interface Order {
  id: string
  userId: string
  symbol: string
  name: string
  side: 'buy' | 'sell'
  orderType: OrderType
  units: number
  priceAtOrder: number
  limitPrice?: number
  stopPrice?: number
  leverage: number
  total: number
  status: 'filled' | 'pending' | 'cancelled'
  expiresAt?: Date | null
  createdAt: Date | null
}

export type PriceMap = Record<string, Asset>
