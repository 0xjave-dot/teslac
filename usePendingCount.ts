import { useState, useEffect } from 'react'
import { onPendingTransactions } from './firestore'

export function usePendingCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    return onPendingTransactions((txs) => setCount(txs.length))
  }, [])

  return count
}





