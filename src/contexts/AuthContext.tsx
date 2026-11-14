import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord, UserRole } from '@/types'

interface AuthContextType {
  user: UserRecord | null
  role: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<UserRecord>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const mapearUsuario = (rec: any): UserRecord => ({
  id: rec.id,
  email: rec.email || '',
  name: rec.name || '',
  avatar: rec.avatar || '',
  role: (rec.role as UserRole) || 'colaborador',
  created: rec.created,
  updated: rec.updated,
})

const mesmoUsuario = (a: UserRecord | null, b: UserRecord | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.avatar === b.avatar &&
    a.role === b.role)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const userRef = useRef<UserRecord | null>(null)

  // Só propaga mudança de identidade real para a árvore React. O authStore
  // emite eventos com NOVO objeto a cada chamada (save/clear/refresh) —
  // propagar sempre re-renderizava telas cujos efeitos dependem de `user`
  // (Hoje/Histórico) e refazia fetch + PATCH em loop até a API limitar (429).
  const setUserSeMudou = (proximo: UserRecord | null) => {
    if (mesmoUsuario(userRef.current, proximo)) return
    userRef.current = proximo
    setUser(proximo)
  }

  const syncUserFromAuthStore = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      setUserSeMudou(mapearUsuario(pb.authStore.record))
    } else {
      setUserSeMudou(null)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    syncUserFromAuthStore()
    const unsubscribe = pb.authStore.onChange(() => {
      syncUserFromAuthStore()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    const mapped = mapearUsuario(authData.record)
    setUserSeMudou(mapped)
    return mapped
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      try {
        const fresh = await pb.collection('users').getOne(pb.authStore.record.id)
        setUserSeMudou(mapearUsuario(fresh))
      } catch (_) {
        // ignore
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
