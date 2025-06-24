import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
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
        { success: false, message: '未找到认证令牌' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    console.log('Token验证结果:', !!payload)
    
    if (!payload) {
      console.log('认证失败: 认证令牌无效或已过期')
      return NextResponse.json(
        { success: false, message: '认证令牌无效' },
        { status: 401 }
      )
    }

    // 验证用户是否仍存在于数据库中
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        role: true,
        deletedAt: true
      }
    })

    if (!user || user.deletedAt) {
      console.log('认证失败: 用户不存在或已被删除')
      // 清除无效的 token
      const response = NextResponse.json(
        { success: false, message: '用户不存在，请重新登录' },
        { status: 401 }
      )
      response.cookies.set('auth-token', '', { 
        expires: new Date(0),
        path: '/'
      })
      return response
    }

    console.log('认证成功:', payload.username)
    return NextResponse.json({
      success: true,
      message: '认证有效',
      data: {
        userId: payload.userId,
        username: payload.username,
        role: payload.role
      }
    })

  } catch (error) {
    console.error('验证认证状态失败:', error)
    return NextResponse.json(
      { success: false, message: '验证失败' },
      { status: 500 }
    )
  }
} 