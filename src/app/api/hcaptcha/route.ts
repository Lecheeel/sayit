import { NextRequest, NextResponse } from 'next/server'
import { storeHCaptchaToken } from '@/lib/captcha'

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET_KEY
const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'hCaptcha token 缺失' },
        { status: 400 }
      )
    }

    if (!HCAPTCHA_SECRET) {
      console.error('HCAPTCHA_SECRET_KEY 环境变量未设置')
      return NextResponse.json(
        { success: false, message: '服务器配置错误' },
        { status: 500 }
      )
    }

    // 获取客户端 IP
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // 向 hCaptcha 服务器验证 token
    const verifyResponse = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: HCAPTCHA_SECRET,
        response: token,
        remoteip: clientIP
      })
    })

    const verifyResult = await verifyResponse.json()

    if (verifyResult.success) {
      // 存储已验证的 token，返回内部 token ID
      const tokenId = storeHCaptchaToken(token)
      
      return NextResponse.json({
        success: true,
        message: 'hCaptcha 验证成功',
        data: {
          tokenId
        }
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'hCaptcha 验证失败',
          errors: verifyResult['error-codes'] || []
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('hCaptcha 验证失败:', error)
    return NextResponse.json(
      { success: false, message: 'hCaptcha 验证失败，请重试' },
      { status: 500 }
    )
  }
} 