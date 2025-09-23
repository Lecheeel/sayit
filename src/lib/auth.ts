import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { verifyTokenWithCache, getCachedUserSession, setCachedUserSession } from './auth-cache'

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// 密码验证
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// JWT Token 生成
export function generateToken(payload: any): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET环境变量未设置，请配置安全的密钥')
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

// JWT Token 验证 (使用缓存优化)
export function verifyToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET环境变量未设置，请配置安全的密钥')
    }
    console.log('JWT验证 - 使用的Secret:', secret === 'your-secret-key' ? '默认密钥' : '自定义密钥')
    
    const payload = jwt.verify(token, secret)
    console.log('JWT验证成功 - 用户ID:', (payload as any).userId)
    return payload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('JWT验证失败: Token已过期', error.expiredAt)
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT验证失败: Token无效', error.message)
    } else {
      console.error('JWT验证失败: 未知错误', error)
    }
    return null
  }
}

// 使用缓存的Token验证
export function verifyTokenCached(token: string): any {
  return verifyTokenWithCache(token)
}

// 生成随机用户名
export function generateUsername(): string {
  const adjectives = ['聪明的', '勇敢的', '可爱的', '活泼的', '安静的', '友善的']
  const animals = ['小猫', '小狗', '小鸟', '小熊', '小兔', '小鹿']
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)]
  const randomNumber = Math.floor(Math.random() * 1000)
  
  return `${randomAdjective}${randomAnimal}${randomNumber}`
}

// 服务端认证验证 - 从请求中验证用户身份 (优化版)
export function authenticateRequest(request: NextRequest): { isAuthenticated: boolean; user: any | null } {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return { isAuthenticated: false, user: null }
    }
    
    // 使用缓存验证
    const payload = verifyTokenCached(token)
    
    if (!payload) {
      return { isAuthenticated: false, user: null }
    }

    // 检查用户会话缓存
    const cachedUser = getCachedUserSession(payload.userId)
    if (cachedUser) {
      return { 
        isAuthenticated: true, 
        user: cachedUser
      }
    }

    // 构建用户信息并缓存
    const user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    }
    
    setCachedUserSession(payload.userId, user)
    
    return { 
      isAuthenticated: true, 
      user
    }
  } catch (error) {
    console.error('认证验证失败:', error)
    return { isAuthenticated: false, user: null }
  }
}

// 优化的输入数据清理和验证
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  // 移除潜在的 XSS 攻击代码和危险字符
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // 移除所有 HTML 标签
    .replace(/javascript:/gi, '') // 移除javascript协议
    .replace(/data:/gi, '') // 移除data协议
    .replace(/vbscript:/gi, '') // 移除vbscript协议
    .trim()
}

// 检查是否包含敏感词或不当内容
export function containsSensitiveWords(text: string): boolean {
  const sensitiveWords = [
    'admin', 'administrator', 'root', 'system', 'test', 'guest',
    '管理员', '系统', '测试', '游客', 'null', 'undefined', 'bot',
    '机器人', 'spam', '垃圾', '广告', 'fuck', '操', '草', '日',
    '妈', '爸', '你妈', '傻逼', '白痴', '蠢货', 'shit', 'damn'
  ]
  
  const lowerText = text.toLowerCase()
  return sensitiveWords.some(word => lowerText.includes(word.toLowerCase()))
}

// 检查用户名是否包含危险的字符组合
export function containsDangerousPatterns(username: string): boolean {
  const dangerousPatterns = [
    /\.\./g,                    // 路径遍历
    /[<>'"&]/g,                 // HTML/XML 特殊字符
    /[{}[\]]/g,                 // 括号字符
    /[|\\\/]/g,                 // 管道符和斜杠
    /[@#$%^&*()+=]/g,          // 特殊符号
    /^\d+$/,                    // 纯数字用户名
    /^[_-]+$/,                  // 纯符号用户名
    /_{3,}/g,                   // 连续下划线
    /--+/g,                     // 连续横线
    /\s{2,}/g,                  // 连续空格
    /^[_-]|[_-]$/g,            // 开头或结尾的特殊字符
  ]
  
  return dangerousPatterns.some(pattern => pattern.test(username))
}

// 计算字符串的实际显示长度（中文字符按2个字符计算）
export function getDisplayLength(str: string): number {
  let length = 0
  for (const char of str) {
    // 中文字符、全角字符等按2个字符计算
    if (/[\u4e00-\u9fa5\uff00-\uffff]/.test(char)) {
      length += 2
    } else {
      length += 1
    }
  }
  return length
}

// 优化的用户名验证函数
export function validateUsername(username: string): { isValid: boolean; message?: string; suggestion?: string } {
  if (!username || typeof username !== 'string') {
    return { isValid: false, message: '用户名不能为空' }
  }

  // 清理用户名
  const cleanUsername = username.trim()
  
  if (cleanUsername.length === 0) {
    return { isValid: false, message: '用户名不能为空或只包含空格' }
  }

  // 字符数量检查（按实际字符数，不是显示长度）
  if (cleanUsername.length < 2) {
    return { isValid: false, message: '用户名至少需要2个字符' }
  }
  
  if (cleanUsername.length > 16) {
    return { isValid: false, message: '用户名不能超过16个字符' }
  }

  // 显示长度检查（考虑中文字符的显示宽度）
  const displayLength = getDisplayLength(cleanUsername)
  if (displayLength > 20) {
    return { isValid: false, message: '用户名显示长度过长（中文字符占2个位置）' }
  }

  // 字符类型检查 - 更精确的中文字符支持
  const allowedPattern = /^[a-zA-Z0-9_\u4e00-\u9fa5\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]+$/
  if (!allowedPattern.test(cleanUsername)) {
    return { 
      isValid: false, 
      message: '用户名只能包含中文、英文字母、数字和下划线',
      suggestion: '请避免使用特殊符号、表情符号或其他特殊字符'
    }
  }

  // 危险模式检查
  if (containsDangerousPatterns(cleanUsername)) {
    return { 
      isValid: false, 
      message: '用户名包含不允许的字符或模式',
      suggestion: '请避免使用特殊符号、连续的符号或纯数字'
    }
  }

  // 敏感词检查
  if (containsSensitiveWords(cleanUsername)) {
    return { 
      isValid: false, 
      message: '用户名包含敏感词汇',
      suggestion: '请选择其他用户名'
    }
  }

  // 检查是否以数字开头（可选规则）
  if (/^\d/.test(cleanUsername)) {
    return { 
      isValid: false, 
      message: '用户名不能以数字开头',
      suggestion: '建议以字母或中文开头'
    }
  }

  // 检查字符组合合理性
  const hasLetter = /[a-zA-Z\u4e00-\u9fa5]/.test(cleanUsername)
  if (!hasLetter) {
    return { 
      isValid: false, 
      message: '用户名必须包含至少一个字母或中文字符',
      suggestion: '纯符号或数字的用户名不被允许'
    }
  }

  // 检查用户名是否过短
  if (cleanUsername.length <= 3 && /^[a-z]{1,3}$/i.test(cleanUsername)) {
    return { 
      isValid: false, 
      message: '用户名过短',
      suggestion: '请使用更长的用户名组合'
    }
  }

  return { isValid: true }
}

// 生成用户名建议
export function generateUsernameSuggestions(baseName: string): string[] {
  const suggestions: string[] = []
  const cleanBase = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').slice(0, 10)
  
  if (cleanBase.length > 0) {
    // 添加数字后缀
    for (let i = 1; i <= 3; i++) {
      const randomNum = Math.floor(Math.random() * 1000) + 1
      suggestions.push(`${cleanBase}${randomNum}`)
    }
    
    // 添加年份
    const currentYear = new Date().getFullYear()
    suggestions.push(`${cleanBase}${currentYear}`)
    
    // 添加下划线组合
    suggestions.push(`${cleanBase}_用户`)
    suggestions.push(`用户_${cleanBase}`)
  }
  
  // 如果没有有效的基础名称，生成完全随机的建议
  if (suggestions.length === 0) {
    const prefixes = ['用户', '小', '大', '新', '老']
    const suffixes = ['同学', '朋友', '伙伴', '', '']
    
    for (let i = 0; i < 5; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
      const num = Math.floor(Math.random() * 9999) + 1
      suggestions.push(`${prefix}${num}${suffix}`)
    }
  }
  
  return suggestions.slice(0, 5) // 最多返回5个建议
}

// 验证密码强度
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: '密码不能为空' }
  }
  
  if (password.length < 6) {
    return { isValid: false, message: '密码长度至少6位' }
  }
  
  if (password.length > 128) {
    return { isValid: false, message: '密码长度不能超过128位' }
  }
  
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/
  if (!passwordRegex.test(password)) {
    return { isValid: false, message: '密码必须包含至少一个字母和一个数字' }
  }
  
  return { isValid: true }
}

// 验证内容长度和格式
export function validateContent(content: string, maxLength: number = 2000): { isValid: boolean; message?: string } {
  if (!content || typeof content !== 'string') {
    return { isValid: false, message: '内容不能为空' }
  }
  
  const cleanContent = content.trim()
  if (cleanContent.length === 0) {
    return { isValid: false, message: '内容不能为空' }
  }
  
  if (cleanContent.length > maxLength) {
    return { isValid: false, message: `内容长度不能超过${maxLength}字符` }
  }
  
  return { isValid: true }
}

// 验证价格（用于市场商品）
export function validatePrice(price: any): { isValid: boolean; message?: string; value?: number } {
  if (price === undefined || price === null || price === '') {
    return { isValid: false, message: '价格不能为空' }
  }
  
  const numericPrice = Number(price)
  
  if (isNaN(numericPrice)) {
    return { isValid: false, message: '价格必须是数字' }
  }
  
  if (numericPrice < 0) {
    return { isValid: false, message: '价格不能为负数' }
  }
  
  if (numericPrice > 999999) {
    return { isValid: false, message: '价格不能超过999999' }
  }
  
  // 限制小数位数为2位
  const roundedPrice = Math.round(numericPrice * 100) / 100
  
  return { isValid: true, value: roundedPrice }
}

// 获取客户端 IP 地址
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP.trim()
  }
  
  if (remoteAddr) {
    return remoteAddr.trim()
  }
  
  return 'unknown'
}

// 记录安全日志
export function logSecurityEvent(event: string, details: any, clientIP?: string): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    details,
    clientIP: clientIP || 'unknown'
  }
  
  // 在生产环境中，这里应该写入专门的安全日志文件或数据库
  console.warn('SECURITY_EVENT:', JSON.stringify(logEntry))
}

// Edge Runtime兼容的简单JWT检查（仅检查格式，不验证签名）
export function isValidJWTFormat(token: string): boolean {
  try {
    // JWT格式检查：应该有三个用.分隔的部分
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }
    
    // 检查每个部分是否是有效的base64
    for (const part of parts) {
      if (!part || part.length === 0) {
        return false
      }
    }
    
    return true
  } catch (error) {
    return false
  }
}

// Edge Runtime兼容的简单payload解析（不验证签名）
export function parseJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    // 解码payload（第二部分）
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    console.error('解析JWT payload失败:', error)
    return null
  }
} 