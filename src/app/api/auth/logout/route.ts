import { NextResponse, NextRequest } from 'next/server'
import { invalidateUserSession, invalidateJWTCache } from '@/lib/auth-cache'
import { verifyTokenCached } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 获取token以便清除相关缓存
    const token = request.cookies.get('auth-token')?.value
    
    // 如果有token，尝试获取用户信息并清除缓存
    if (token) {
      try {
        const payload = verifyTokenCached(token)
        if (payload && payload.userId) {
          // 清除用户会话缓存
          invalidateUserSession(payload.userId)
          console.log('已清除用户缓存:', payload.userId)
        }
        // 清除JWT token缓存
        invalidateJWTCache(token)
        console.log('已清除JWT token缓存')
      } catch (error) {
        console.log('清除缓存时出错（这是正常的）:', error)
        // 即使验证失败，也要尝试清除JWT缓存
        if (token) {
          invalidateJWTCache(token)
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      message: '退出登录成功'
    })

    // 清除访问token Cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/'
    })
    
    // 清除刷新token Cookie
    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/'
    })

    return response

  } catch (error) {
    console.error('退出登录失败:', error)
    return NextResponse.json(
      { success: false, message: '退出登录失败' },
      { status: 500 }
    )
  }
} 