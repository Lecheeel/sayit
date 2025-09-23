import { LRUCache } from 'lru-cache'
import { verifyToken } from './auth'

// JWT验证结果缓存
const jwtCache = new LRUCache<string, any>({
  max: 10000, // 最多缓存10000个token
  ttl: 5 * 60 * 1000, // 5分钟过期
})

// 用户会话缓存
const userSessionCache = new LRUCache<string, any>({
  max: 5000,
  ttl: 10 * 60 * 1000, // 10分钟过期
})

// 生成token的安全hash作为缓存key
function getTokenHash(token: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(token + process.env.JWT_SECRET).digest('hex').substring(0, 32)
}

// 缓存JWT验证结果
export function getCachedJWTVerification(token: string): any | null {
  const tokenHash = getTokenHash(token)
  return jwtCache.get(tokenHash)
}

export function setCachedJWTVerification(token: string, payload: any): void {
  const tokenHash = getTokenHash(token)
  jwtCache.set(tokenHash, payload)
}

// 清除特定token的缓存
export function invalidateJWTCache(token: string): void {
  const tokenHash = getTokenHash(token)
  jwtCache.delete(tokenHash)
}

// 优化的JWT验证函数
export function verifyTokenWithCache(token: string): any {
  // 先检查缓存
  const cached = getCachedJWTVerification(token)
  if (cached) {
    console.log('JWT验证 - 使用缓存结果')
    return cached
  }

  // 缓存未命中，进行实际验证
  const payload = verifyToken(token)
  if (payload) {
    setCachedJWTVerification(token, payload)
  }
  
  return payload
}

// 用户会话缓存
export function getCachedUserSession(userId: string): any | null {
  return userSessionCache.get(userId)
}

export function setCachedUserSession(userId: string, userData: any): void {
  userSessionCache.set(userId, userData)
}

export function invalidateUserSession(userId: string): void {
  userSessionCache.delete(userId)
  console.log('已清除用户会话缓存:', userId)
}

// 批量JWT验证（用于并发处理）
export async function batchVerifyTokens(tokens: string[]): Promise<Map<string, any>> {
  const results = new Map<string, any>()
  const uncachedTokens: string[] = []
  
  // 先检查缓存
  tokens.forEach(token => {
    const cached = getCachedJWTVerification(token)
    if (cached) {
      results.set(token, cached)
    } else {
      uncachedTokens.push(token)
    }
  })
  
  // 并行验证未缓存的tokens
  if (uncachedTokens.length > 0) {
    const verificationPromises = uncachedTokens.map(async (token) => {
      const payload = verifyToken(token)
      if (payload) {
        setCachedJWTVerification(token, payload)
      }
      return { token, payload }
    })
    
    const verificationResults = await Promise.all(verificationPromises)
    verificationResults.forEach(({ token, payload }) => {
      results.set(token, payload)
    })
  }
  
  return results
}

// 清理过期缓存
export function clearExpiredCache(): void {
  // LRU Cache 会自动清理过期项，这里可以添加手动清理逻辑
  console.log('清理过期缓存完成')
}

// 强制清理所有缓存
export function forceCleanAllCache(): void {
  jwtCache.clear()
  userSessionCache.clear()
  console.log('已强制清理所有认证缓存')
}

// 获取缓存统计信息
export function getCacheStats(): { jwtCacheSize: number; userSessionCacheSize: number } {
  return {
    jwtCacheSize: jwtCache.size,
    userSessionCacheSize: userSessionCache.size
  }
} 