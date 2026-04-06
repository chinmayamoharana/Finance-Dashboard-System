import axios from 'axios'

export const AUTH_STORAGE_KEY = 'finance-dashboard-auth'
const AUTH_CHANGE_EVENT = 'finance-auth-changed'

function normalizeApiBaseUrl(value) {
  const fallbackUrl = 'http://127.0.0.1:8000/api'
  const rawUrl = (value || fallbackUrl).trim().replace(/\/+$/, '')

  if (rawUrl.endsWith('/api')) {
    return rawUrl
  }

  return `${rawUrl}/api`
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

let refreshPromise = null

export function readStoredAuth() {
  const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function onAuthChange(callback) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function writeStoredAuth(authData) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
  notifyAuthChange()
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  notifyAuthChange()
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const auth = readStoredAuth()
  if (auth?.access) {
    config.headers.Authorization = `Bearer ${auth.access}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const auth = readStoredAuth()

    if (
      error.response?.status === 401 &&
      auth?.refresh &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh/')
    ) {
      originalRequest._retry = true

      refreshPromise =
        refreshPromise ||
        axios
          .post(`${API_BASE_URL}/auth/refresh/`, { refresh: auth.refresh })
          .then((response) => {
            const updatedAuth = {
              ...auth,
              access: response.data.access,
              refresh: response.data.refresh || auth.refresh,
            }
            writeStoredAuth(updatedAuth)
            return updatedAuth.access
          })
          .catch((refreshError) => {
            clearStoredAuth()
            throw refreshError
          })
          .finally(() => {
            refreshPromise = null
          })

      const newAccessToken = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    }

    return Promise.reject(error)
  },
)

export default apiClient
