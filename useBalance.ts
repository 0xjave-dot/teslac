import { useState, useEffect } from 'react'
import { onBalance } from './firestore'
import type { Balance } from './types'

export function useBalance(uid: string | undefined): Balance {
  const [balance, setBalance] = useState<Balance>({ available: 0, locked: 0, total: 0 })

  useEffect(() => {
    if (!uid) return
    return onBalance(uid, setBalance)
  }, [uid])

  return balance
}





