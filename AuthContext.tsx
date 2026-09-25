import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './firebase'
import { ensureUserDoc, onUserDoc } from './firestore'
import type { UserDoc } from './types'

interface AuthContextValue {
  currentUser: User | null
  userDoc: UserDoc | null
  loading: boolean
  role: string
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  userDoc: null,
  loading: true,
  role: 'user',
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let settled = false
    const finishLoading = () => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }
    const timeout = window.setTimeout(finishLoading, 5000)
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (!user) {
        setUserDoc(null)
        finishLoading()
      }
    }, finishLoading)
    return () => {
      window.clearTimeout(timeout)
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    let settled = false
    const finishLoading = () => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }
    const timeout = window.setTimeout(finishLoading, 5000)
    ensureUserDoc(currentUser).catch(() => undefined)
    const unsub = onUserDoc(currentUser.uid, (doc) => {
      setUserDoc(doc)
      finishLoading()
    }, finishLoading)
    return () => {
      window.clearTimeout(timeout)
      unsub()
    }
  }, [currentUser])

  const role = userDoc?.role || 'user'

  return (
    <AuthContext.Provider value={{ currentUser, userDoc, loading, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}




