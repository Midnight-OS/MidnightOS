"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface AuthRedirectProps {
  children: React.ReactNode
  redirectTo?: string
}

export function AuthRedirect({ children, redirectTo = '/dashboard' }: AuthRedirectProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, redirectTo, router])

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // Don't render children if user is authenticated
  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}