import { useState, useEffect, useCallback } from 'react'
import { authManager } from './auth-client'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
  email?: string
  role?: string
}

// 安全的sessionStorage管理
const AUTH_STORAGE_KEY = 'auth_session'
const AUTH_VERIFY_CACHE_KEY = 'auth_verify_cache'

// 前端验证结果缓存
interface AuthVerifyCache {
  result: boolean
  user: User | null
  timestamp: number
  expiresAt: number
}

// 缓存有效期（5分钟）
const CACHE_DURATION = 5 * 60 * 1000

// 全局缓存状态管理
let globalAuthCache: AuthVerifyCache | null = null
let verifyPromise: Promise<boolean> | null = null

function getStoredUser(): User | null {
  // 仅在客户端环境下访问 sessionStorage
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // 优先使用sessionStorage而不是localStorage，减少安全风险
    const userData = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!userData) return null
    
    const parsedUser = JSON.parse(userData)
    
    // 验证用户数据结构
    if (!parsedUser.id || !parsedUser.username) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    
    return parsedUser
  } catch (error) {
    console.error('获取存储用户数据时出错:', error)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function setStoredUser(user: User | null): void {
  // 仅在客户端环境下访问 sessionStorage
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (user) {
      // 只存储必要的非敏感信息
      const safeUserData = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar
        // 不存储email等敏感信息
      }
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeUserData))
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch (error) {
    console.error('存储用户数据时出错:', error)
  }
}

// 获取缓存的验证结果
function getCachedVerifyResult(): AuthVerifyCache | null {
  // 优先从全局缓存获取
  if (globalAuthCache && globalAuthCache.expiresAt > Date.now()) {
    console.log('使用全局内存缓存的验证结果')
    return globalAuthCache
  }

  // 仅在客户端环境下访问 sessionStorage
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const cached = sessionStorage.getItem(AUTH_VERIFY_CACHE_KEY)
    if (cached) {
      const parsedCache: AuthVerifyCache = JSON.parse(cached)
      if (parsedCache.expiresAt > Date.now()) {
        console.log('使用存储缓存的验证结果')
        // 同步到全局缓存
        globalAuthCache = parsedCache
        return parsedCache
      } else {
        console.log('存储缓存已过期，清除')
        sessionStorage.removeItem(AUTH_VERIFY_CACHE_KEY)
      }
    }
  } catch (error) {
    console.error('获取缓存验证结果失败:', error)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_VERIFY_CACHE_KEY)
    }
  }
  return null
}

// 设置缓存的验证结果
function setCachedVerifyResult(result: boolean, user: User | null): void {
  const now = Date.now()
  const cache: AuthVerifyCache = {
    result,
    user,
    timestamp: now,
    expiresAt: now + CACHE_DURATION
  }

  // 设置全局缓存
  globalAuthCache = cache

  // 仅在客户端环境下访问 sessionStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(AUTH_VERIFY_CACHE_KEY, JSON.stringify(cache))
      console.log('已缓存验证结果，有效期5分钟')
    } catch (error) {
      console.error('缓存验证结果失败:', error)
    }
  }
}

// 清除验证结果缓存
function clearVerifyCache(): void {
  globalAuthCache = null
  verifyPromise = null
  
  // 仅在客户端环境下访问 sessionStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(AUTH_VERIFY_CACHE_KEY)
      console.log('已清除验证结果缓存')
    } catch (error) {
      console.error('清除验证结果缓存失败:', error)
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearAuthState = useCallback(() => {
    setUser(null)
    setStoredUser(null)
    setError(null)
    clearVerifyCache()
  }, [])

  const verifyAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      
      // 检查缓存，如果有效则直接使用
      const cachedResult = getCachedVerifyResult()
      if (cachedResult) {
        if (cachedResult.result && cachedResult.user) {
          setUser(cachedResult.user)
          setStoredUser(cachedResult.user)
          if (process.env.NODE_ENV === 'development') {
            console.log('使用缓存的身份验证结果:', cachedResult.user.username)
          }
          return true
        } else {
          clearAuthState()
          return false
        }
      }

      // 如果已有进行中的验证请求，则等待该请求完成
      if (verifyPromise) {
        console.log('等待现有验证请求完成')
        return await verifyPromise
      }

      // 开始新的验证请求
      console.log('开始新的身份验证请求')
      verifyPromise = (async () => {
        try {
          // 使用新的认证管理器进行验证
          const authResult = await authManager.checkAuthStatus()
          
          console.log('认证API响应:', { isAuthenticated: authResult.isAuthenticated, hasUser: !!authResult.user, error: authResult.error })

          if (authResult.isAuthenticated && authResult.user) {
            setUser(authResult.user)
            setStoredUser(authResult.user)
            setCachedVerifyResult(true, authResult.user)
            if (process.env.NODE_ENV === 'development') {
              console.log('身份验证成功并已缓存:', authResult.user.username)
            }
            return true
          } else {
            // 认证失败，清除所有状态
            console.log('认证失败，清除认证状态')
            clearAuthState()
            setCachedVerifyResult(false, null)
            
            // 设置错误信息
            if (authResult.error) {
              setError(authResult.error.includes('已过期') ? '登录已过期，请重新登录' : authResult.error)
            }
            
            return false
          }
        } catch (error) {
          console.error('验证认证状态时发生错误:', error)
          
          // 网络错误时的处理
          if (error instanceof TypeError && error.message.includes('fetch')) {
            setError('网络连接错误，请检查网络设置')
            
            // 网络错误时，尝试使用存储的数据
            const storedUser = getStoredUser()
            if (storedUser) {
              setUser(storedUser)
              if (process.env.NODE_ENV === 'development') {
                console.log('使用存储的用户数据（离线模式）')
              }
              return true
            }
          } else {
            setError('认证验证失败，请刷新页面重试')
            // 其他错误时清除状态
            clearAuthState()
          }
          
          return false
        } finally {
          // 清除进行中的请求引用
          verifyPromise = null
        }
      })()

      return await verifyPromise
    } catch (error) {
      console.error('验证认证状态失败:', error)
      setError('认证验证失败')
      clearAuthState()
      return false
    }
  }, [clearAuthState])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // 首先检查缓存的验证结果
        const cachedResult = getCachedVerifyResult()
        if (cachedResult) {
          if (cachedResult.result && cachedResult.user) {
            setUser(cachedResult.user)
            if (process.env.NODE_ENV === 'development') {
              console.log('初始化：使用缓存的验证结果', cachedResult.user.username)
            }
            setLoading(false)
            return
          } else {
            clearAuthState()
            setLoading(false)
            return
          }
        }

        // 没有缓存时，检查存储的用户数据
        const storedUser = getStoredUser()
        if (storedUser) {
          setUser(storedUser)
          // 后台验证存储的用户是否仍然有效
          await verifyAuthStatus()
        } else {
          await verifyAuthStatus()
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error)
        setError('初始化失败，请刷新页面重试')
        clearAuthState()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [verifyAuthStatus, clearAuthState])

  const updateUser = useCallback((userData: User | null) => {
    setUser(userData)
    setStoredUser(userData)
    setError(null)
    
    // 更新缓存
    if (userData) {
      setCachedVerifyResult(true, userData)
    } else {
      clearVerifyCache()
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('用户状态已更新:', userData?.username || '已退出')
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setError(null)
      
      // 使用认证管理器进行登出
      const success = await authManager.logout()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('退出登录结果:', success)
      }
      
      // 清除本地状态
      clearAuthState()
    } catch (error) {
      console.error('退出登录失败:', error)
      setError('退出登录失败，但本地状态已清除')
      // 即使失败也清除本地状态
      clearAuthState()
    }
  }, [clearAuthState])

  const refreshAuth = useCallback(async () => {
    setLoading(true)
    try {
      // 强制清除缓存，重新验证
      clearVerifyCache()
      await verifyAuthStatus()
    } finally {
      setLoading(false)
    }
  }, [verifyAuthStatus])

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    updateUser,
    logout,
    refreshAuth,
    clearError: () => setError(null)
  }
} 