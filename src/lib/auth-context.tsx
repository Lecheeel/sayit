'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './useAuth'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
  email?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  updateUser: (userData: User | null) => void
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// 为了向后兼容，保留原有的 useAuth 导出
export { useAuth } 