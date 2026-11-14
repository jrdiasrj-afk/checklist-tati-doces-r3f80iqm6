import React, { createContext, useContext, useEffect, useState } from 'react'
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUserFromAuthStore = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const rec = pb.authStore.record
      setUser({
        id: rec.id,
        email: rec.email || '',
        name: rec.name || '',
        avatar: rec.avatar || '',
        role: (rec.role as UserRole) || 'colaborador',
        created: rec.created,
        updated: rec.updated,
      })
    } else {
      setUser(null)
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
    const rec = authData.record
    const mapped: UserRecord = {
      id: rec.id,
      email: rec.email || '',
      name: rec.name || '',
      avatar: rec.avatar || '',
      role: (rec.role as UserRole) || 'colaborador',
      created: rec.created,
      updated: rec.updated,
    }
    setUser(mapped)
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
        setUser({
          id: fresh.id,
          email: fresh.email || '',
          name: fresh.name || '',
          avatar: fresh.avatar || '',
          role: (fresh.role as UserRole) || 'colaborador',
          created: fresh.created,
          updated: fresh.updated,
        })
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
