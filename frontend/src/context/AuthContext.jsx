import { createContext, startTransition, useContext, useEffect, useState } from 'react'

import apiClient, { clearStoredAuth, onAuthChange, readStoredAuth, writeStoredAuth } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth())

  useEffect(() => onAuthChange(() => setAuth(readStoredAuth())), [])

  const value = {
    auth,
    user: auth?.user ?? null,
    isAuthenticated: Boolean(auth?.access && auth?.user),
    async register(payload) {
      const response = await apiClient.post('/auth/register/', payload)
      return response.data
    },
    async login(credentials) {
      const response = await apiClient.post('/auth/login/', credentials)
      writeStoredAuth(response.data)
      startTransition(() => {
        setAuth(response.data)
      })
      return response.data.user
    },
    logout() {
      clearStoredAuth()
      setAuth(null)
    },
    async refreshProfile() {
      const response = await apiClient.get('/auth/me/')
      const nextAuth = { ...readStoredAuth(), user: response.data }
      writeStoredAuth(nextAuth)
      setAuth(nextAuth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
