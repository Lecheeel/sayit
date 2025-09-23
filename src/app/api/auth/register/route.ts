import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validateUsername, validatePassword, sanitizeInput, getClientIP, logSecurityEvent } from '@/lib/auth'
import { verifyAndUseHCaptchaToken, checkRateLimit } from '@/lib/captcha'

export async function POST(request: NextRequest) {
  try {
    // 获取客户端信息
    const clientIP = getClientIP(request)
    
    // 检查频率限制
    if (!checkRateLimit(clientIP)) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { endpoint: '/api/auth/register' }, clientIP)
      return NextResponse.json(
        { success: false, message: '注册请求过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { 
      username, 
      password, 
      hcaptchaTokenId
    } = body

    // 基础验证 - 必须有 hCaptcha
    if (!username || !password || !hcaptchaTokenId) {
      logSecurityEvent('INVALID_REGISTRATION_ATTEMPT', { reason: 'missing_fields' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请完成所有验证步骤' },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanUsername = sanitizeInput(username)
    const cleanPassword = password // 密码不需要 sanitize，但需要验证

    // 用户名格式验证
    const usernameValidation = validateUsername(cleanUsername)
    if (!usernameValidation.isValid) {
      logSecurityEvent('INVALID_USERNAME_FORMAT', { username: cleanUsername, reason: usernameValidation.message }, clientIP)
      return NextResponse.json(
        { success: false, message: usernameValidation.message },
        { status: 400 }
      )
    }

    // 密码强度验证
    const passwordValidation = validatePassword(cleanPassword)
    if (!passwordValidation.isValid) {
      logSecurityEvent('WEAK_PASSWORD_ATTEMPT', { username: cleanUsername, reason: passwordValidation.message }, clientIP)
      return NextResponse.json(
        { success: false, message: passwordValidation.message },
        { status: 400 }
      )
    }

    // 验证 hCaptcha token
    if (process.env.NODE_ENV === 'development') {
      console.log('验证 hCaptcha TokenId:', hcaptchaTokenId)
    }
    
    const isHCaptchaValid = verifyAndUseHCaptchaToken(hcaptchaTokenId)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('hCaptcha 验证结果:', isHCaptchaValid)
    }
    
    if (!isHCaptchaValid) {
      return NextResponse.json(
        { success: false, message: 'hCaptcha 验证失败、已过期或已被使用' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    })

    if (existingUser) {
      logSecurityEvent('DUPLICATE_USERNAME_ATTEMPT', { username: cleanUsername }, clientIP)
      return NextResponse.json(
        { success: false, message: '用户名已存在，请选择其他用户名' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await hashPassword(cleanPassword)

    // 创建用户 - 添加 IP 记录用于安全审计
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        // 如果有 IP 字段的话可以记录注册 IP
        // registrationIP: clientIP
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
      }
    })

    // 记录成功注册的日志
    logSecurityEvent('USER_REGISTERED', { username: cleanUsername, userId: newUser.id }, clientIP)

    return NextResponse.json({
      success: true,
      message: '注册成功！请登录',
      data: newUser
    })

  } catch (error) {
    console.error('注册失败:', error)
    
    // 如果是频率限制错误
    if (error instanceof Error && error.message.includes('请求过于频繁')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { success: false, message: '注册失败，请重试' },
      { status: 500 }
    )
  }
} 