import { useState, useEffect } from 'react'
import { onHoldings } from './firestore'
import type { Holding } from './types'

export function useHoldings(uid: string | undefined): Holding[] {
  const [holdings, setHoldings] = useState<Holding[]>([])

  useEffect(() => {
    if (!uid) return
    return onHoldings(uid, setHoldings)
  }, [uid])

  return holdings
}





