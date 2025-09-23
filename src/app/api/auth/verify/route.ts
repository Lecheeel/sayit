import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth-security'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    console.log('验证请求 - Token存在:', !!token)
    if (token) {
      console.log('Token前8位:', token.substring(0, 8) + '...')
    }

    if (!token) {
      console.log('认证失败: 未找到认证令牌')
      return NextResponse.json(
        { success: false, message: '未找到认证令牌', user: null },
        { status: 401 }
      )
    }

    const verification = await verifyAccessToken(token, request)
    console.log('Token验证结果:', verification.isValid, verification.error)
    
    if (!verification.isValid || !verification.payload) {
      console.log('认证失败: 认证令牌无效或已过期')
      // 清除无效的token
      const response = NextResponse.json(
        { success: false, message: '认证令牌无效', user: null },
        { status: 401 }
      )
      response.cookies.set('auth-token', '', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
        path: '/'
      })
      return response
    }

    const payload = verification.payload
    
    // 验证用户是否仍存在于数据库中
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        deletedAt: true
      }
    })

    if (!user || user.deletedAt) {
      console.log('认证失败: 用户不存在或已被删除')
      // 清除无效的 token
      const response = NextResponse.json(
        { success: false, message: '用户不存在，请重新登录', user: null },
        { status: 401 }
      )
      response.cookies.set('auth-token', '', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
        path: '/'
      })
      response.cookies.set('refresh-token', '', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
        path: '/'
      })
      return response
    }

    console.log('认证成功:', payload.username)
    // 构建响应
    const response = NextResponse.json({
      success: true,
      message: '认证有效',
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role
      },
      needsRefresh: verification.shouldRefresh
    })
    
    // 如果需要刷新token，设置响应头提示前端
    if (verification.shouldRefresh) {
      response.headers.set('X-Token-Refresh-Needed', 'true')
    }
    
    return response

  } catch (error) {
    console.error('验证认证状态失败:', error)
    return NextResponse.json(
      { success: false, message: '验证失败', user: null },
      { status: 500 }
    )
  }
} 