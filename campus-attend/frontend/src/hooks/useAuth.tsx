import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, AuthContextType } from '../types/auth'
import { getCurrentUser, loginUser, logoutUser } from '../services/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setError(null)
    } catch (err: any) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (usernameOrEmail: string, pass: string) => {
    setError(null)
    try {
      const loggedInUser = await loginUser(usernameOrEmail, pass)
      setUser(loggedInUser)
    } catch (err: any) {
      setError(err.message || 'Login failed.')
      throw err
    }
  }

  const logout = async () => {
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
