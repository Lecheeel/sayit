import { NextResponse } from 'next/server'
import { generateHumanVerification } from '@/lib/captcha'

export async function GET() {
  try {
    const verification = generateHumanVerification()
    return NextResponse.json({
      success: true,
      data: {
        id: verification.id,
        question: verification.question
      }
    })
  } catch (error) {
    console.error('生成人机验证失败:', error)
    return NextResponse.json(
      { success: false, message: '人机验证生成失败' },
      { status: 500 }
    )
  }
} 