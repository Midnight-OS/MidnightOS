"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api-client'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  checkAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  const login = (token: string, userData: User) => {
    apiClient.setToken(token)
    setUser(userData)
  }

  const logout = () => {
    apiClient.clearToken()
    setUser(null)
    router.push('/')
  }

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!token) {
        setIsLoading(false)
        return
      }

      // Verify token with API
      const userData = await apiClient.getCurrentUser()
      setUser(userData.user || userData)
    } catch (error) {
      console.error('Auth check failed:', error)
      // Clear invalid token
      apiClient.clearToken()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}