import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  runTransaction,
  addDoc,
  serverTimestamp,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore'
import { User } from 'firebase/auth'
import { db } from './firebase'
import type { UserDoc, Balance, Transaction, Holding, Order, Asset, PriceCandle, PriceResolution } from './types'

function toDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return null
}

export async function ensureUserDoc(user: User) {
  const userRef = doc(db, 'users', user.uid)
  const balRef = doc(db, 'balances', user.uid)

  const [userSnap, balanceSnap] = await Promise.all([getDoc(userRef), getDoc(balRef)])

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      country: '',
      role: 'user',
      createdAt: serverTimestamp(),
    })
  }

  if (!balanceSnap.exists()) {
    await setDoc(balRef, {
      available: 0,
      locked: 0,
      total: 0,
      updatedAt: serverTimestamp(),
    })
  }

  const snap = userSnap.exists() ? userSnap : await getDoc(userRef)
  return snap.exists() ? (snap.data() as UserDoc) : undefined
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return { ...d, uid, createdAt: toDate(d.createdAt) } as UserDoc
}

export async function updateUserProfile(uid: string, data: Partial<UserDoc>) {
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export function onUserDoc(uid: string, cb: (u: UserDoc | null) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) { cb(null); return }
    const d = snap.data()
    cb({ ...d, uid, createdAt: toDate(d.createdAt) } as UserDoc)
  })
}

export function onBalance(uid: string, cb: (b: Balance) => void) {
  return onSnapshot(doc(db, 'balances', uid), (snap) => {
    if (!snap.exists()) { cb({ available: 0, locked: 0, total: 0 }); return }
    cb(snap.data() as Balance)
  })
}

export function onAssets(cb: (assets: Asset[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(collection(db, 'assets'), (snap: QuerySnapshot<DocumentData>) => {
    cb(snap.docs.map((d) => ({ ...d.data(), symbol: d.id } as Asset)))
  }, onError)
}

export function onPriceHistory(
  symbol: string,
  resolution: PriceResolution,
  fromTime: number,
  cb: (candles: PriceCandle[]) => void,
  onError?: (error: Error) => void
) {
  const historyQuery = query(
    collection(db, 'priceHistory', symbol, resolution),
    where('time', '>=', fromTime),
    orderBy('time', 'asc'),
    limit(2000)
  )
  return onSnapshot(historyQuery, (snap) => {
    cb(snap.docs.map((d) => d.data() as PriceCandle))
  }, onError)
}

export function onTransactions(uid: string, limitN: number, cb: (txs: Transaction[]) => void) {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) } as Transaction)))
  })
}

export function onAllTransactions(cb: (txs: Transaction[]) => void) {
  const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) } as Transaction)))
  })
}

export function onPendingTransactions(cb: (txs: Transaction[]) => void) {
  const q = query(
    collection(db, 'transactions'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) } as Transaction)))
  })
}

export function onHoldings(uid: string, cb: (holdings: Holding[]) => void) {
  return onSnapshot(collection(db, 'holdings', uid, 'assets'), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), symbol: d.id } as Holding)))
  })
}

export function onOrders(uid: string, symbol: string, cb: (orders: Order[]) => void) {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', uid),
    where('symbol', '==', symbol),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) } as Order)))
  })
}

export async function createDepositRequest(uid: string, userName: string, amount: number, note: string) {
  await addDoc(collection(db, 'transactions'), {
    userId: uid,
    userName,
    type: 'deposit',
    amount,
    status: 'pending',
    note,
    adminNote: '',
    createdAt: serverTimestamp(),
  })
}

export async function createWithdrawalRequest(uid: string, userName: string, amount: number, note: string) {
  await runTransaction(db, async (tx) => {
    const balRef = doc(db, 'balances', uid)
    const balSnap = await tx.get(balRef)
    if (!balSnap.exists()) throw new Error('Balance not found')
    const bal = balSnap.data() as Balance
    if (bal.available < amount) throw new Error('Insufficient balance')
    tx.update(balRef, {
      available: bal.available - amount,
      locked: bal.locked + amount,
      updatedAt: serverTimestamp(),
    })
    const txRef = doc(collection(db, 'transactions'))
    tx.set(txRef, {
      userId: uid,
      userName,
      type: 'withdrawal',
      amount,
      status: 'pending',
      note,
      adminNote: '',
      createdAt: serverTimestamp(),
    })
  })
}

export async function placeBuyOrder(uid: string, userName: string, symbol: string, name: string, units: number, price: number) {
  const total = units * price
  await runTransaction(db, async (tx) => {
    const balRef = doc(db, 'balances', uid)
    const balSnap = await tx.get(balRef)
    if (!balSnap.exists()) throw new Error('Balance not found')
    const bal = balSnap.data() as Balance
    if (bal.available < total) throw new Error('Insufficient balance')

    const holdingRef = doc(db, 'holdings', uid, 'assets', symbol)
    const holdingSnap = await tx.get(holdingRef)

    let newUnits = units
    let newAvgBuy = price
    if (holdingSnap.exists()) {
      const h = holdingSnap.data() as Holding
      const totalUnits = h.units + units
      newAvgBuy = (h.avgBuyPrice * h.units + price * units) / totalUnits
      newUnits = totalUnits
    }

    tx.update(balRef, {
      available: bal.available - total,
      updatedAt: serverTimestamp(),
    })
    tx.set(holdingRef, {
      symbol,
      name,
      type: 'stock',
      units: newUnits,
      avgBuyPrice: newAvgBuy,
      updatedAt: serverTimestamp(),
    })
    const orderRef = doc(collection(db, 'orders'))
    tx.set(orderRef, {
      userId: uid,
      userName,
      symbol,
      name,
      side: 'buy',
      units,
      priceAtOrder: price,
      total,
      createdAt: serverTimestamp(),
    })
  })
}

export async function placeSellOrder(uid: string, userName: string, symbol: string, name: string, units: number, price: number) {
  const total = units * price
  await runTransaction(db, async (tx) => {
    const balRef = doc(db, 'balances', uid)
    const balSnap = await tx.get(balRef)
    if (!balSnap.exists()) throw new Error('Balance not found')
    const bal = balSnap.data() as Balance

    const holdingRef = doc(db, 'holdings', uid, 'assets', symbol)
    const holdingSnap = await tx.get(holdingRef)
    if (!holdingSnap.exists()) throw new Error('No holding found')
    const h = holdingSnap.data() as Holding
    if (h.units < units) throw new Error('Not enough units')

    const remaining = h.units - units

    tx.update(balRef, {
      available: bal.available + total,
      updatedAt: serverTimestamp(),
    })

    if (remaining <= 0) {
      tx.delete(holdingRef)
    } else {
      tx.update(holdingRef, { units: remaining, updatedAt: serverTimestamp() })
    }

    const orderRef = doc(collection(db, 'orders'))
    tx.set(orderRef, {
      userId: uid,
      userName,
      symbol,
      name,
      side: 'sell',
      units,
      priceAtOrder: price,
      total,
      createdAt: serverTimestamp(),
    })
  })
}

export async function adminApproveDeposit(txId: string, userId: string, amount: number, adminNote: string) {
  await runTransaction(db, async (tx) => {
    const txRef = doc(db, 'transactions', txId)
    const balRef = doc(db, 'balances', userId)
    const balSnap = await tx.get(balRef)
    const bal = balSnap.exists() ? (balSnap.data() as Balance) : { available: 0, locked: 0, total: 0 }
    tx.update(txRef, { status: 'approved', adminNote, updatedAt: serverTimestamp() })
    tx.set(balRef, {
      available: bal.available + amount,
      locked: bal.locked,
      total: bal.total + amount,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function adminRejectDeposit(txId: string, adminNote: string) {
  await updateDoc(doc(db, 'transactions', txId), {
    status: 'rejected',
    adminNote,
    updatedAt: serverTimestamp(),
  })
}

export async function adminApproveWithdrawal(txId: string, userId: string, amount: number, adminNote: string) {
  await runTransaction(db, async (tx) => {
    const txRef = doc(db, 'transactions', txId)
    const balRef = doc(db, 'balances', userId)
    const balSnap = await tx.get(balRef)
    const bal = balSnap.exists() ? (balSnap.data() as Balance) : { available: 0, locked: 0, total: 0 }
    tx.update(txRef, { status: 'approved', adminNote, updatedAt: serverTimestamp() })
    tx.set(balRef, {
      available: bal.available,
      locked: Math.max(0, bal.locked - amount),
      total: Math.max(0, bal.total - amount),
      updatedAt: serverTimestamp(),
    })
  })
}

export async function adminRejectWithdrawal(txId: string, userId: string, amount: number, adminNote: string) {
  await runTransaction(db, async (tx) => {
    const txRef = doc(db, 'transactions', txId)
    const balRef = doc(db, 'balances', userId)
    const balSnap = await tx.get(balRef)
    const bal = balSnap.exists() ? (balSnap.data() as Balance) : { available: 0, locked: 0, total: 0 }
    tx.update(txRef, { status: 'rejected', adminNote, updatedAt: serverTimestamp() })
    tx.set(balRef, {
      available: bal.available + amount,
      locked: Math.max(0, bal.locked - amount),
      total: bal.total,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => {
    const data = d.data()
    return { ...data, uid: d.id, createdAt: toDate(data.createdAt) } as UserDoc
  })
}

export async function getAllBalances(): Promise<Record<string, Balance>> {
  const snap = await getDocs(collection(db, 'balances'))
  const map: Record<string, Balance> = {}
  snap.docs.forEach((d) => { map[d.id] = d.data() as Balance })
  return map
}

export async function getUserTransactions(uid: string) {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toDate(d.data().createdAt) } as Transaction))
}

export async function getUserHoldings(uid: string): Promise<Holding[]> {
  const snap = await getDocs(collection(db, 'holdings', uid, 'assets'))
  return snap.docs.map((d) => ({ ...d.data(), symbol: d.id } as Holding))
}

export async function changeUserRole(uid: string, role: 'user' | 'admin') {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function getRecentSignups(limitN: number): Promise<UserDoc[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitN))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return { ...data, uid: d.id, createdAt: toDate(data.createdAt) } as UserDoc
  })
}

export async function getTodayOrderVolume(): Promise<number> {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const q = query(collection(db, 'orders'), where('createdAt', '>=', Timestamp.fromDate(start)))
  const snap = await getDocs(q)
  return snap.docs.reduce((sum, d) => sum + (d.data().total || 0), 0)
}





