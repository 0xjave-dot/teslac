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

export interface Order {
  id: string
  userId: string
  symbol: string
  name: string
  side: 'buy' | 'sell'
  units: number
  priceAtOrder: number
  total: number
  createdAt: Date | null
}

export type PriceMap = Record<string, Asset>





