'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import apiClient from './api-client'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isMfaEnabled: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, mfaCode?: string) => Promise<{ requiresMfa?: boolean }>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = Cookies.get('accessToken')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      Cookies.remove('accessToken')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string, mfaCode?: string) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
      mfaCode,
    })

    if (response.data.requiresMfa) {
      return { requiresMfa: true }
    }

    const { accessToken, user: userData } = response.data
    Cookies.set('accessToken', accessToken, { expires: 1/96 }) // 15 minutes
    setUser(userData)
    router.push('/dashboard')
    return {}
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      Cookies.remove('accessToken')
      setUser(null)
      router.push('/auth/login')
    }
  }

  const register = async (data: RegisterData) => {
    await apiClient.post('/auth/register', data)
    // Auto-login after registration
    await login(data.email, data.password)
  }

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshUser }}>
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
