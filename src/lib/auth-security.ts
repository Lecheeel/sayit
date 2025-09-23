// 注意：此文件仅用于API Routes (Node.js Runtime)
// 中间件使用 auth-edge.ts 进行Edge Runtime兼容的验证

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

// 安全配置
const SECURITY_CONFIG = {
  JWT_EXPIRES_IN: '2h', // 访问token 2小时过期
  REFRESH_TOKEN_EXPIRES_IN: '7d', // 刷新token 7天过期
  MAX_DEVICES_PER_USER: 5, // 每用户最多5个设备
  TOKEN_ROTATION_INTERVAL: 30 * 60 * 1000, // 30分钟轮换
  FINGERPRINT_ENTROPY_THRESHOLD: 0.8 // 设备指纹熵值阈值
}

// Token类型定义
interface TokenPayload {
  userId: string
  username: string
  role: string
  deviceId: string
  sessionId: string
  fingerprint: string
  iat: number
  exp: number
  tokenVersion: number
}

interface RefreshTokenPayload {
  userId: string
  deviceId: string
  sessionId: string
  type: 'refresh'
  iat: number
  exp: number
}

// 设备指纹生成（与Edge Runtime版本保持一致）
export function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  // 移除IP地址以保持指纹稳定性
  // IP地址在移动网络环境下变化频繁，不适合作为稳定指纹
  const fingerprintData = [
    userAgent,
    acceptLanguage,
    acceptEncoding
  ].join('|')
  
  return crypto.createHash('sha256').update(fingerprintData).digest('hex')
}

// 获取客户端IP
function getClientIP(request: NextRequest): string {
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-forwarded-for',  // 标准代理头
    'x-real-ip',        // Nginx
    'x-client-ip',      // Apache
    'forwarded'         // RFC 7239
  ]
  
  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // 取第一个IP（如果有多个）
      const ip = value.split(',')[0].trim()
      if (isValidIP(ip)) {
        return ip
      }
    }
  }
  
  return 'unknown'
}

// IP地址验证
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// 生成安全的sessionId
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

// 生成安全的deviceId
function generateDeviceId(): string {
  return crypto.randomBytes(16).toString('hex')
}

// 获取JWT密钥（支持密钥轮换）
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === 'your-secret-key' || secret.length < 32) {
    throw new Error('JWT_SECRET必须设置为至少32位的强密钥')
  }
  return secret
}

// 生成访问token
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const secret = getJWTSecret()
  const now = Math.floor(Date.now() / 1000)
  
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + (2 * 60 * 60), // 2小时过期
    tokenVersion: getCurrentTokenVersion(payload.userId)
  }
  
  return jwt.sign(tokenPayload, secret, { 
    algorithm: 'HS256',
    issuer: 'sayit-app',
    audience: 'sayit-users'
  })
}

// 生成刷新token
export function generateRefreshToken(userId: string, deviceId: string, sessionId: string): string {
  const secret = getJWTSecret()
  const now = Math.floor(Date.now() / 1000)
  
  const payload: RefreshTokenPayload = {
    userId,
    deviceId,
    sessionId,
    type: 'refresh',
    iat: now,
    exp: now + (7 * 24 * 60 * 60) // 7天过期
  }
  
  return jwt.sign(payload, secret, { 
    algorithm: 'HS256',
    issuer: 'sayit-app',
    audience: 'sayit-users'
  })
}

// 验证访问token
export async function verifyAccessToken(token: string, request: NextRequest): Promise<{
  isValid: boolean
  payload?: TokenPayload
  error?: string
  shouldRefresh?: boolean
}> {
  try {
    const secret = getJWTSecret()
    
    // 验证JWT签名和格式
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'sayit-app',
      audience: 'sayit-users'
    }) as TokenPayload
    
    // 检查token版本
    const currentVersion = getCurrentTokenVersion(decoded.userId)
    if (decoded.tokenVersion !== currentVersion) {
      return {
        isValid: false,
        error: 'Token版本已过期，请重新登录',
        shouldRefresh: false
      }
    }
    
    // 检查会话是否仍然有效
    const isSessionValid = await verifyUserSession(decoded.userId, decoded.sessionId, decoded.deviceId)
    if (!isSessionValid) {
      return {
        isValid: false,
        error: '会话已过期',
        shouldRefresh: true
      }
    }
    
    // 检查是否接近过期
    const shouldRefresh = isTokenNearExpiry(decoded.exp)
    
    return {
      isValid: true,
      payload: decoded,
      shouldRefresh
    }
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        isValid: false,
        error: 'Token已过期',
        shouldRefresh: true
      }
    } else if (error instanceof jwt.JsonWebTokenError) {
      return {
        isValid: false,
        error: 'Token格式无效',
        shouldRefresh: false
      }
    } else {
      console.error('Token验证失败:', error)
      return {
        isValid: false,
        error: '验证过程出错',
        shouldRefresh: false
      }
    }
  }
}

// 验证刷新token
export async function verifyRefreshToken(token: string): Promise<{
  isValid: boolean
  payload?: RefreshTokenPayload
  error?: string
}> {
  try {
    const secret = getJWTSecret()
    
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'sayit-app',
      audience: 'sayit-users'
    }) as RefreshTokenPayload
    
    // 验证token类型
    if (decoded.type !== 'refresh') {
      return {
        isValid: false,
        error: '无效的刷新token类型'
      }
    }
    
    // 验证会话
    const isSessionValid = await verifyUserSession(decoded.userId, decoded.sessionId, decoded.deviceId)
    if (!isSessionValid) {
      return {
        isValid: false,
        error: '刷新token会话已失效'
      }
    }
    
    return {
      isValid: true,
      payload: decoded
    }
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        isValid: false,
        error: '刷新token已过期'
      }
    } else {
      return {
        isValid: false,
        error: '刷新token验证失败'
      }
    }
  }
}

// 检查token是否接近过期
function isTokenNearExpiry(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const timeLeft = exp - now
  return timeLeft < 15 * 60 // 少于15分钟
}

// 获取当前token版本
function getCurrentTokenVersion(userId: string): number {
  // 这里可以从数据库或缓存中获取用户的token版本
  // 当用户更改密码或发生安全事件时，可以增加版本号使所有旧token失效
  return 1
}

// 验证用户会话
async function verifyUserSession(userId: string, sessionId: string, deviceId: string): Promise<boolean> {
  try {
    // 这里应该查询数据库中的活跃会话
    // 暂时简化处理
    return true
  } catch (error) {
    console.error('验证用户会话失败:', error)
    return false
  }
}

// 创建用户会话
export async function createUserSession(userId: string, deviceId: string, request: NextRequest): Promise<{
  sessionId: string
  accessToken: string
  refreshToken: string
}> {
  const sessionId = generateSessionId()
  const simpleFingerprint = generateDeviceFingerprint(request).substring(0, 16) // 只保留前16位
  
  // 生成tokens
  const accessToken = generateAccessToken({
    userId,
    username: '', // 这里可以传入实际用户名
    role: 'user',
    deviceId,
    sessionId,
    fingerprint: simpleFingerprint,
    tokenVersion: getCurrentTokenVersion(userId)
  })
  
  const refreshToken = generateRefreshToken(userId, deviceId, sessionId)
  
  return {
    sessionId,
    accessToken,
    refreshToken
  }
}

// 刷新token
export async function refreshAccessToken(refreshToken: string, request: NextRequest): Promise<{
  success: boolean
  accessToken?: string
  newRefreshToken?: string
  error?: string
}> {
  const verificationResult = await verifyRefreshToken(refreshToken)
  
  if (!verificationResult.isValid || !verificationResult.payload) {
    return {
      success: false,
      error: verificationResult.error || '刷新token无效'
    }
  }
  
  const { userId, deviceId, sessionId } = verificationResult.payload
  
  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true }
  })
  
  if (!user) {
    return {
      success: false,
      error: '用户不存在'
    }
  }
  
  // 生成新的访问token
  const simpleFingerprint = generateDeviceFingerprint(request).substring(0, 16)
  const newAccessToken = generateAccessToken({
    userId,
    username: user.username,
    role: user.role,
    deviceId,
    sessionId,
    fingerprint: simpleFingerprint,
    tokenVersion: getCurrentTokenVersion(userId)
  })
  
  // 生成新的刷新token（token轮换）
  const newRefreshToken = generateRefreshToken(userId, deviceId, sessionId)
  
  return {
    success: true,
    accessToken: newAccessToken,
    newRefreshToken
  }
}

// 记录安全事件
async function logSecurityEvent(event: string, details: any, clientIP: string): Promise<void> {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    details,
    clientIP
  }
  
  // 在生产环境中应该写入专门的安全日志系统
  console.warn('SECURITY_EVENT:', JSON.stringify(logEntry))
  
  // 这里可以添加更多安全响应逻辑，比如：
  // - 发送警报邮件
  // - 临时封禁IP
  // - 强制用户重新登录
}

// 撤销用户所有token
export async function revokeAllUserTokens(userId: string): Promise<void> {
  // 增加用户的token版本，使所有现有token失效
  // 这里应该更新数据库中的token版本
  console.log(`撤销用户 ${userId} 的所有token`)
}

// 清理过期会话
export async function cleanupExpiredSessions(): Promise<void> {
  // 清理数据库中的过期会话
  console.log('清理过期会话')
} 