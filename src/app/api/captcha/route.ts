import { NextRequest, NextResponse } from 'next/server'
import { generateCaptcha } from '@/lib/captcha'

export async function GET(request: NextRequest) {
  try {
    // 获取客户端信息
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined
    const acceptLanguage = request.headers.get('accept-language') || undefined
    
    const captcha = generateCaptcha(clientIP, userAgent, acceptLanguage)
    
    return NextResponse.json({
      success: true,
      data: {
        id: captcha.id,
        image: captcha.image
      }
    })
  } catch (error) {
    console.error('生成验证码失败:', error)
    
    // 如果是频率限制错误
    if (error instanceof Error && error.message.includes('请求过于频繁')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { success: false, message: '验证码生成失败' },
      { status: 500 }
    )
  }
} 