import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

// 验证码缓存接口
interface CaptchaData {
  code: string
  timestamp: number
  attempts: number
  clientFingerprint?: string
}

// hCaptcha Token 缓存接口
interface HCaptchaTokenData {
  token: string
  timestamp: number
  verified: boolean
  used: boolean
}

// 频率限制接口
interface RateLimitData {
  requests: number
  lastRequest: number
  blocked: boolean
}

// 存储验证码的内存缓存
const captchaCache = new Map<string, CaptchaData>()
// 存储 hCaptcha token 的缓存
const hcaptchaTokenCache = new Map<string, HCaptchaTokenData>()
// 频率限制缓存（基于 IP）
const rateLimitCache = new Map<string, RateLimitData>()

// 配置常量
const CAPTCHA_EXPIRE_TIME = 5 * 60 * 1000 // 5分钟
const HCAPTCHA_TOKEN_EXPIRE_TIME = 2 * 60 * 1000 // 2分钟
const MAX_ATTEMPTS = 3 // 最大尝试次数
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分钟窗口
const MAX_REQUESTS_PER_WINDOW = 10 // 每分钟最多10次请求

// 清理过期数据
function cleanExpiredData() {
  const now = Date.now()
  
  // 清理过期验证码
  for (const [key, value] of captchaCache.entries()) {
    if (now - value.timestamp > CAPTCHA_EXPIRE_TIME) {
      captchaCache.delete(key)
    }
  }
  
  // 清理过期 hCaptcha token
  for (const [key, value] of hcaptchaTokenCache.entries()) {
    if (now - value.timestamp > HCAPTCHA_TOKEN_EXPIRE_TIME) {
      hcaptchaTokenCache.delete(key)
    }
  }
  
  // 清理过期的频率限制记录
  for (const [key, value] of rateLimitCache.entries()) {
    if (now - value.lastRequest > RATE_LIMIT_WINDOW) {
      rateLimitCache.delete(key)
    }
  }
}

// 检查频率限制
export function checkRateLimit(clientIP: string): boolean {
  cleanExpiredData()
  
  const now = Date.now()
  const rateLimit = rateLimitCache.get(clientIP)
  
  if (!rateLimit) {
    rateLimitCache.set(clientIP, {
      requests: 1,
      lastRequest: now,
      blocked: false
    })
    return true
  }
  
  // 如果在时间窗口内
  if (now - rateLimit.lastRequest < RATE_LIMIT_WINDOW) {
    rateLimit.requests++
    rateLimit.lastRequest = now
    
    if (rateLimit.requests > MAX_REQUESTS_PER_WINDOW) {
      rateLimit.blocked = true
      return false
    }
  } else {
    // 重置计数器
    rateLimit.requests = 1
    rateLimit.lastRequest = now
    rateLimit.blocked = false
  }
  
  return !rateLimit.blocked
}

// 生成客户端指纹
function generateClientFingerprint(userAgent?: string, acceptLanguage?: string): string {
  const data = `${userAgent || ''}_${acceptLanguage || ''}_${Date.now()}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
}

// 生成随机颜色
function getRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 生成更复杂的随机字符串验证码
function generateRandomCode(length = 5): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789' // 排除容易混淆的字符 O, 0, 1, I
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 生成更复杂的 SVG 验证码，增加干扰
function generateSVGCaptcha(text: string): string {
  const width = 140
  const height = 50
  const fontSize = 20
  
  // 生成更多干扰线
  let lines = ''
  for (let i = 0; i < 8; i++) {
    const x1 = Math.random() * width
    const y1 = Math.random() * height
    const x2 = Math.random() * width
    const y2 = Math.random() * height
    const color = getRandomColor()
    const strokeWidth = Math.random() * 2 + 0.5
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" opacity="0.4"/>`
  }
  
  // 生成字符，增加更多变形
  let chars = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const x = (width / (text.length + 1)) * (i + 1)
    const y = height / 2 + (Math.random() - 0.5) * 12
    const rotation = (Math.random() - 0.5) * 40
    const scaleX = 0.8 + Math.random() * 0.4
    const scaleY = 0.8 + Math.random() * 0.4
    const color = getRandomColor()
    
    chars += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" 
              font-weight="bold" fill="${color}" text-anchor="middle" 
              transform="rotate(${rotation} ${x} ${y}) scale(${scaleX}, ${scaleY})">${char}</text>`
  }
  
  // 生成更多干扰点和形状
  let disturbances = ''
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const color = getRandomColor()
    const radius = Math.random() * 2 + 0.5
    disturbances += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" opacity="0.3"/>`
  }
  
  // 添加随机矩形干扰
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const w = Math.random() * 10 + 2
    const h = Math.random() * 10 + 2
    const color = getRandomColor()
    disturbances += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="0.2"/>`
  }
  
  // 生成渐变背景
  const gradientId = `grad_${Math.random().toString(36).substr(2, 9)}`
  const gradient = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#e9ecef;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
      </linearGradient>
    </defs>
  `
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${gradient}
      <rect width="${width}" height="${height}" fill="url(#${gradientId})"/>
      ${lines}
      ${disturbances}
      ${chars}
    </svg>
  `
  
  return svg
}

// 生成图形验证码
export function generateCaptcha(clientIP?: string, userAgent?: string, acceptLanguage?: string): { id: string; image: string } {
  // 检查频率限制
  if (clientIP && !checkRateLimit(clientIP)) {
    throw new Error('请求过于频繁，请稍后再试')
  }
  
  cleanExpiredData()
  
  const id = uuidv4()
  const code = generateRandomCode()
  const clientFingerprint = generateClientFingerprint(userAgent, acceptLanguage)
  
  // 生成 SVG 验证码
  const svgContent = generateSVGCaptcha(code)
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`
  
  // 保存到缓存
  captchaCache.set(id, {
    code,
    timestamp: Date.now(),
    attempts: 0,
    clientFingerprint
  })
  
  return {
    id,
    image: svgDataUrl
  }
}

// 验证图形验证码
export function verifyCaptcha(id: string, userInput: string, clientFingerprint?: string): boolean {
  cleanExpiredData()
  
  const cached = captchaCache.get(id)
  if (!cached) {
    return false
  }
  
  // 检查是否过期
  if (Date.now() - cached.timestamp > CAPTCHA_EXPIRE_TIME) {
    captchaCache.delete(id)
    return false
  }
  
  // 增加尝试次数
  cached.attempts++
  
  // 检查尝试次数
  if (cached.attempts > MAX_ATTEMPTS) {
    captchaCache.delete(id)
    return false
  }
  
  // 验证客户端指纹（可选的额外安全措施）
  if (clientFingerprint && cached.clientFingerprint && cached.clientFingerprint !== clientFingerprint) {
    captchaCache.delete(id)
    return false
  }
  
  const isValid = cached.code.toLowerCase() === userInput.toLowerCase()
  
  // 验证成功或失败次数过多时删除缓存
  if (isValid || cached.attempts >= MAX_ATTEMPTS) {
    captchaCache.delete(id)
  }
  
  return isValid
}

// 存储已验证的 hCaptcha token
export function storeHCaptchaToken(token: string): string {
  cleanExpiredData()
  
  const tokenId = uuidv4()
  hcaptchaTokenCache.set(tokenId, {
    token,
    timestamp: Date.now(),
    verified: true,
    used: false
  })
  
  return tokenId
}

// 验证并使用 hCaptcha token
export function verifyAndUseHCaptchaToken(tokenId: string): boolean {
  cleanExpiredData()
  
  const cached = hcaptchaTokenCache.get(tokenId)
  if (!cached) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Token 未找到缓存:', tokenId)
    }
    return false
  }
  
  // 检查是否过期
  const now = Date.now()
  const timeDiff = now - cached.timestamp
  if (timeDiff > HCAPTCHA_TOKEN_EXPIRE_TIME) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Token 已过期:', { tokenId, timeDiff, expireTime: HCAPTCHA_TOKEN_EXPIRE_TIME })
    }
    hcaptchaTokenCache.delete(tokenId)
    return false
  }
  
  // 检查是否已使用
  if (cached.used) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Token 已被使用:', tokenId)
    }
    return false
  }
  
  // 标记为已使用并删除
  hcaptchaTokenCache.delete(tokenId)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Token 验证成功:', tokenId)
  }
  
  return cached.verified
}

// 生成更复杂的数学验证题（作为备用验证）
export function generateComplexMathVerification(): { id: string; question: string; answer: number } {
  const id = uuidv4()
  const operations = [
    { op: '+', symbol: '+' },
    { op: '-', symbol: '-' },
    { op: '*', symbol: '×' },
    { op: 'sqrt', symbol: '√' },
    { op: 'pow', symbol: '^' }
  ]
  
  const operation = operations[Math.floor(Math.random() * operations.length)]
  let num1: number, num2: number, answer: number, question: string
  
  switch (operation.op) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 10
      num2 = Math.floor(Math.random() * 50) + 10
      answer = num1 + num2
      question = `${num1} ${operation.symbol} ${num2} = ?`
      break
    case '-':
      num1 = Math.floor(Math.random() * 80) + 20
      num2 = Math.floor(Math.random() * num1) + 1
      answer = num1 - num2
      question = `${num1} ${operation.symbol} ${num2} = ?`
      break
    case '*':
      num1 = Math.floor(Math.random() * 12) + 2
      num2 = Math.floor(Math.random() * 12) + 2
      answer = num1 * num2
      question = `${num1} ${operation.symbol} ${num2} = ?`
      break
    case 'sqrt':
      const squares = [4, 9, 16, 25, 36, 49, 64, 81, 100]
      num1 = squares[Math.floor(Math.random() * squares.length)]
      answer = Math.sqrt(num1)
      question = `${operation.symbol}${num1} = ?`
      break
    case 'pow':
      num1 = Math.floor(Math.random() * 5) + 2
      num2 = Math.floor(Math.random() * 3) + 2
      answer = Math.pow(num1, num2)
      question = `${num1}${operation.symbol}${num2} = ?`
      break
    default:
      num1 = 2
      num2 = 2
      answer = 4
      question = '2 + 2 = ?'
  }
  
  // 保存到缓存
  captchaCache.set(id, {
    code: answer.toString(),
    timestamp: Date.now(),
    attempts: 0
  })
  
  return { id, question, answer }
}

// 验证数学题答案
export function verifyMathAnswer(id: string, userAnswer: number): boolean {
  cleanExpiredData()
  
  const cached = captchaCache.get(id)
  if (!cached) {
    return false
  }
  
  // 检查是否过期
  if (Date.now() - cached.timestamp > CAPTCHA_EXPIRE_TIME) {
    captchaCache.delete(id)
    return false
  }
  
  // 增加尝试次数
  cached.attempts++
  
  // 检查尝试次数
  if (cached.attempts > MAX_ATTEMPTS) {
    captchaCache.delete(id)
    return false
  }
  
  const isValid = parseInt(cached.code) === userAnswer
  
  // 验证成功或失败次数过多时删除缓存
  if (isValid || cached.attempts >= MAX_ATTEMPTS) {
    captchaCache.delete(id)
  }
  
  return isValid
}

// 生成人机验证题目（保持向后兼容）
export function generateHumanVerification(): { id: string; question: string; answer: number } {
  return generateComplexMathVerification()
}

// 验证人机验证答案（保持向后兼容）
export function verifyHumanVerification(id: string, userAnswer: number): boolean {
  return verifyMathAnswer(id, userAnswer)
} 