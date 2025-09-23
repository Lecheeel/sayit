import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, sanitizeInput, getClientIP, logSecurityEvent } from '@/lib/auth'
import { createUserSession, generateDeviceFingerprint } from '@/lib/auth-security'
import { verifyAndUseHCaptchaToken } from '@/lib/captcha'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const body = await request.json()
    const { username, password, hcaptchaTokenId } = body

    // 基础验证
    if (!username || !password) {
      logSecurityEvent('INVALID_LOGIN_ATTEMPT', { reason: 'missing_credentials' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请输入用户名和密码' },
        { status: 400 }
      )
    }

    // 验证 hCaptcha token
    if (!hcaptchaTokenId) {
      logSecurityEvent('INVALID_LOGIN_ATTEMPT', { reason: 'missing_hcaptcha' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请完成人机验证' },
        { status: 400 }
      )
    }

    const isHCaptchaValid = verifyAndUseHCaptchaToken(hcaptchaTokenId)
    if (!isHCaptchaValid) {
      logSecurityEvent('INVALID_LOGIN_ATTEMPT', { reason: 'invalid_hcaptcha' }, clientIP)
      return NextResponse.json(
        { success: false, message: 'hCaptcha 验证失败或已过期' },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanUsername = sanitizeInput(username)

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: {
        id: true,
        username: true,
        password: true,
        avatar: true,
        nickname: true,
        role: true,
        createdAt: true,
      }
    })

    if (!user) {
      logSecurityEvent('LOGIN_FAILED', { username: cleanUsername, reason: 'user_not_found' }, clientIP)
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      logSecurityEvent('LOGIN_FAILED', { username: cleanUsername, reason: 'invalid_password' }, clientIP)
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 生成设备ID和创建安全会话
    const deviceId = generateDeviceFingerprint(request).substring(0, 16) // 使用指纹前16位作为设备ID
    const session = await createUserSession(user.id, deviceId, request)

    // 准备用户数据（排除密码）
    const userData = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    }

    // 记录成功登录
    logSecurityEvent('USER_LOGIN_SUCCESS', { 
      username: cleanUsername, 
      userId: user.id,
      deviceId,
      fingerprint: generateDeviceFingerprint(request).substring(0, 16) + '...'
    }, clientIP)

    // 设置安全响应
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        user: userData,
        sessionId: session.sessionId
      }
    })

    // 设置访问token cookie (2小时)
    response.cookies.set('auth-token', session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60, // 2小时
      path: '/'
    })
    
    // 设置刷新token cookie (7天)
    response.cookies.set('refresh-token', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/'
    })

    return response

  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json(
      { success: false, message: '登录失败，请重试' },
      { status: 500 }
    )
  }
} 