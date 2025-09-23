import { NextRequest, NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/auth-security'
import { getClientIP, logSecurityEvent } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 从HttpOnly cookie中获取刷新token
    const refreshToken = request.cookies.get('refresh-token')?.value
    
    if (!refreshToken) {
      logSecurityEvent('REFRESH_TOKEN_MISSING', {}, clientIP)
      return NextResponse.json(
        { success: false, message: '刷新token不存在' },
        { status: 401 }
      )
    }
    
    // 执行token刷新
    const result = await refreshAccessToken(refreshToken, request)
    
    if (!result.success) {
      logSecurityEvent('REFRESH_TOKEN_FAILED', { error: result.error }, clientIP)
      
      // 如果刷新失败，清除所有认证cookie
      const response = NextResponse.json(
        { success: false, message: result.error || 'Token刷新失败' },
        { status: 401 }
      )
      
      // 清除认证cookie
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
    
    // 刷新成功，设置新的token
    const response = NextResponse.json({
      success: true,
      message: 'Token刷新成功'
    })
    
    // 设置新的访问token
    response.cookies.set('auth-token', result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60, // 2小时
      path: '/'
    })
    
    // 如果有新的刷新token，也要更新（token轮换）
    if (result.newRefreshToken) {
      response.cookies.set('refresh-token', result.newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7天
        path: '/'
      })
    }
    
    logSecurityEvent('TOKEN_REFRESH_SUCCESS', {}, clientIP)
    
    return response
    
  } catch (error) {
    console.error('Token刷新端点错误:', error)
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
} 