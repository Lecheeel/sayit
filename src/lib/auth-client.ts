// 客户端认证管理工具 - 处理自动token刷新和认证状态
export class AuthManager {
  private static instance: AuthManager
  private refreshPromise: Promise<boolean> | null = null
  private isRefreshing = false

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  // 自动刷新token的fetch包装器
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let response = await fetch(url, {
      ...options,
      credentials: 'include', // 确保包含HttpOnly cookies
    })

    // 如果收到401且需要刷新token
    if (response.status === 401) {
      try {
        // 克隆response以避免body stream already read错误
        const responseClone = response.clone()
        const data = await responseClone.json()
        
        if (data.needsRefresh) {
          console.log('检测到token过期，尝试自动刷新...')
          const refreshed = await this.refreshToken()
          
          if (refreshed) {
            console.log('Token刷新成功，重试原始请求')
            // 重试原始请求
            response = await fetch(url, {
              ...options,
              credentials: 'include',
            })
          } else {
            console.log('Token刷新失败，跳转到登录页面')
            this.redirectToLogin()
          }
        } else if (data.needsAuth) {
          console.log('需要登录，跳转到登录页面')
          this.redirectToLogin()
        }
      } catch (error) {
        console.error('处理认证错误时发生异常:', error)
      }
    }

    return response
  }

  // 刷新token
  async refreshToken(): Promise<boolean> {
    // 如果已经在刷新中，等待现有的刷新完成
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performRefresh()

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('Token刷新成功')
          return true
        }
      }

      console.warn('Token刷新失败:', response.status)
      return false
    } catch (error) {
      console.error('Token刷新过程中发生错误:', error)
      return false
    }
  }

  // 跳转到登录页面
  private redirectToLogin(): void {
    const currentPath = window.location.pathname
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
    window.location.href = loginUrl
  }

  // 检查用户认证状态
  async checkAuthStatus(): Promise<{
    isAuthenticated: boolean
    user?: any
    error?: string
  }> {
    try {
      const response = await this.authenticatedFetch('/api/auth/verify')
      
      // 如果response已经被处理过（比如401重定向），直接返回未认证状态
      if (!response.ok) {
        return {
          isAuthenticated: false,
          error: response.status === 401 ? '未授权' : '认证检查失败'
        }
      }
      
      const data = await response.json()

      if (data.success) {
        return {
          isAuthenticated: true,
          user: data.user
        }
      } else {
        return {
          isAuthenticated: false,
          error: data.message || '认证失败'
        }
      }
    } catch (error) {
      console.error('检查认证状态失败:', error)
      return {
        isAuthenticated: false,
        error: '网络错误'
      }
    }
  }

  // 登出
  async logout(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // 跳转到首页
        window.location.href = '/'
        return true
      }

      return false
    } catch (error) {
      console.error('登出过程中发生错误:', error)
      return false
    }
  }

  // 生成客户端设备指纹
  generateClientFingerprint(): string {
    const fingerprint = [
      navigator.userAgent || '',
      navigator.language || '',
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString()
    ].join('|')

    // 简单哈希
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    return Math.abs(hash).toString(16)
  }
}

// 全局实例
export const authManager = AuthManager.getInstance()

// 便捷的fetch包装器
export const authenticatedFetch = (url: string, options?: RequestInit) => {
  return authManager.authenticatedFetch(url, options)
}

// 检查是否在客户端环境
export const isClient = typeof window !== 'undefined'

// 自动处理响应头中的刷新提示
if (isClient) {
  // 监听所有fetch请求的响应头
  const originalFetch = window.fetch
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args)
    
    // 检查是否需要刷新token
    if (response.headers.get('X-Token-Refresh-Needed') === 'true') {
      console.log('服务器建议刷新token，执行后台刷新...')
      // 在后台静默刷新token
      authManager.refreshToken().catch(error => {
        console.error('后台token刷新失败:', error)
      })
    }
    
    return response
  }
} 