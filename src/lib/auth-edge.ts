// Edge Runtime兼容的认证模块 - 专用于中间件
import { NextRequest } from 'next/server'

// Edge Runtime兼容的设备指纹生成
export function generateSimpleFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  const data = `${userAgent}|${acceptLanguage}|${acceptEncoding}`
  return simpleHash(data)
}

// 简单的哈希函数（Edge Runtime兼容）
function simpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  return Math.abs(hash).toString(16)
}

// 获取客户端IP（Edge Runtime兼容）
function getClientIP(request: NextRequest): string {
  const headers = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip'
  ]
  
  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }
  
  return 'unknown'
}

// 简单的JWT payload解析（不验证签名，仅用于中间件基础检查）
export function parseJWTPayloadUnsafe(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    // 解码payload（第二部分）
    const payload = parts[1]
    // 添加padding如果需要
    const paddedPayload = payload + '==='.slice(0, (4 - payload.length % 4) % 4)
    
    // 使用atob解码base64
    const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    console.error('解析JWT payload失败:', error)
    return null
  }
}

// 检查token是否过期（基于payload，不验证签名）
export function isTokenExpiredUnsafe(token: string): boolean {
  const payload = parseJWTPayloadUnsafe(token)
  if (!payload || !payload.exp) {
    return true
  }
  
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

// 检查token是否接近过期
export function isTokenNearExpiryUnsafe(token: string): boolean {
  const payload = parseJWTPayloadUnsafe(token)
  if (!payload || !payload.exp) {
    return true
  }
  
  const now = Math.floor(Date.now() / 1000)
  const timeLeft = payload.exp - now
  return timeLeft < 15 * 60 // 少于15分钟
}

// Edge Runtime兼容的基础token验证（仅用于中间件）
export function verifyTokenBasic(token: string, request: NextRequest): {
  isValid: boolean
  payload?: any
  shouldRefresh?: boolean
  error?: string
} {
  try {
    // 基本格式检查
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Token格式无效' }
    }
    
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { isValid: false, error: 'JWT格式无效' }
    }
    
    // 解析payload
    const payload = parseJWTPayloadUnsafe(token)
    if (!payload) {
      return { isValid: false, error: '无法解析token' }
    }
    
    // 检查过期
    if (isTokenExpiredUnsafe(token)) {
      return { 
        isValid: false, 
        error: 'Token已过期',
        shouldRefresh: true
      }
    }
    
    // 检查是否需要刷新
    const shouldRefresh = isTokenNearExpiryUnsafe(token)
    
    return {
      isValid: true,
      payload,
      shouldRefresh
    }
    
  } catch (error) {
    console.error('基础token验证失败:', error)
    return { 
      isValid: false, 
      error: '验证过程出错',
      shouldRefresh: false
    }
  }
}

// 检查token格式是否有效
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }
  
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
} 