import { useState, useEffect } from 'react'
import { onTransactions } from './firestore'
import type { Transaction } from './types'

export function useTransactions(uid: string | undefined, limitN = 50): Transaction[] {
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(() => {
    if (!uid) return
    return onTransactions(uid, limitN, setTxs)
  }, [uid, limitN])

  return txs
}





