import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, validateContent, sanitizeInput, getClientIP, logSecurityEvent } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 服务端认证验证 - 不信任前端
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user) {
      logSecurityEvent('UNAUTHORIZED_CONFESSION_ATTEMPT', { endpoint: '/api/confessions/create' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    // 验证用户是否存在于数据库中
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, username: true }
    })

    if (!existingUser) {
      console.error('用户不存在于数据库中:', user.userId)
      logSecurityEvent('USER_NOT_FOUND', { 
        userId: user.userId,
        username: user.username 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '用户信息无效，请重新登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, images = [], isAnonymous = true } = body

    // 验证内容
    const contentValidation = validateContent(content, 1000) // 表白内容限制1000字符
    if (!contentValidation.isValid) {
      logSecurityEvent('INVALID_CONFESSION_CONTENT', { 
        userId: user.userId, 
        reason: contentValidation.message 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: contentValidation.message },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanContent = sanitizeInput(content)
    
    // 验证图片数组
    if (!Array.isArray(images)) {
      logSecurityEvent('INVALID_CONFESSION_IMAGES', { 
        userId: user.userId,
        reason: 'images_not_array' 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '图片数据格式错误' },
        { status: 400 }
      )
    }

    // 限制图片数量
    if (images.length > 9) {
      logSecurityEvent('TOO_MANY_IMAGES', { 
        userId: user.userId,
        imageCount: images.length 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '最多只能上传9张图片' },
        { status: 400 }
      )
    }

    // 验证图片URL
    const validImages = images.filter((img: string) => {
      if (typeof img !== 'string') return false
      // 允许相对路径（如 /uploads/xxx.jpg）和完整URL
      if (img.startsWith('/uploads/')) return true
      try {
        new URL(img)
        return true
      } catch {
        return false
      }
    })

    // 创建表白内容
    const confession = await prisma.confession.create({
      data: {
        content: cleanContent,
        images: JSON.stringify(validImages),
        isAnonymous: Boolean(isAnonymous),
        authorId: existingUser.id  // 使用已验证的用户ID
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    })

    // 记录创建成功
    logSecurityEvent('CONFESSION_CREATED', { 
      userId: user.userId,
      confessionId: confession.id,
      isAnonymous 
    }, clientIP)

    // 返回创建的内容
    return NextResponse.json({
      success: true,
      message: '表白发布成功！',
      data: {
        ...confession,
        images: JSON.parse(confession.images)
      }
    })

  } catch (error) {
    const clientIP = getClientIP(request)
    console.error('创建表白失败:', error)
    
    // 详细的错误信息记录
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      logSecurityEvent('CONFESSION_CREATE_ERROR', { 
        error: error.message,
        name: error.name
      }, clientIP)
    } else {
      logSecurityEvent('CONFESSION_CREATE_ERROR', { error: 'unknown' }, clientIP)
    }
    
    return NextResponse.json(
      { success: false, message: '创建表白失败，请重试' },
      { status: 500 }
    )
  }
} 