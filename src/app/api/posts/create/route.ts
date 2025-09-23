import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, validateContent, sanitizeInput, getClientIP, logSecurityEvent } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 服务端认证验证 - 不信任前端
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user) {
      logSecurityEvent('UNAUTHORIZED_POST_ATTEMPT', { endpoint: '/api/posts/create' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, images = [], category, tags = [] } = body

    // 验证标题
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      logSecurityEvent('INVALID_POST_TITLE', { userId: user.userId }, clientIP)
      return NextResponse.json(
        { success: false, message: '请输入帖子标题' },
        { status: 400 }
      )
    }

    if (title.length > 100) {
      logSecurityEvent('POST_TITLE_TOO_LONG', { userId: user.userId, titleLength: title.length }, clientIP)
      return NextResponse.json(
        { success: false, message: '标题长度不能超过100字符' },
        { status: 400 }
      )
    }

    // 验证内容
    const contentValidation = validateContent(content, 5000) // 帖子内容限制5000字符
    if (!contentValidation.isValid) {
      logSecurityEvent('INVALID_POST_CONTENT', { 
        userId: user.userId, 
        reason: contentValidation.message 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: contentValidation.message },
        { status: 400 }
      )
    }

    // 验证分类
    const validCategories = ['study', 'life', 'entertainment', 'sports', 'food', 'other']
    if (category && !validCategories.includes(category)) {
      logSecurityEvent('INVALID_POST_CATEGORY', { 
        userId: user.userId, 
        category 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '无效的分类' },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanTitle = sanitizeInput(title)
    const cleanContent = sanitizeInput(content)
    
    // 验证图片数组
    if (!Array.isArray(images)) {
      logSecurityEvent('INVALID_POST_IMAGES', { 
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
      logSecurityEvent('TOO_MANY_POST_IMAGES', { 
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

    // 验证标签数组
    if (!Array.isArray(tags)) {
      logSecurityEvent('INVALID_POST_TAGS', { 
        userId: user.userId,
        reason: 'tags_not_array' 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '标签数据格式错误' },
        { status: 400 }
      )
    }

    // 限制标签数量和长度
    if (tags.length > 10) {
      logSecurityEvent('TOO_MANY_TAGS', { 
        userId: user.userId,
        tagCount: tags.length 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '最多只能添加10个标签' },
        { status: 400 }
      )
    }

    const validTags = tags.filter((tag: string) => {
      if (typeof tag !== 'string') return false
      const cleanTag = tag.trim()
      return cleanTag.length > 0 && cleanTag.length <= 20
    }).map((tag: string) => sanitizeInput(tag))

    // 创建帖子
    const post = await prisma.post.create({
      data: {
        title: cleanTitle,
        content: cleanContent,
        images: JSON.stringify(validImages),
        category: category || 'other',
        tags: JSON.stringify(validTags),
        authorId: user.userId
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
    logSecurityEvent('POST_CREATED', { 
      userId: user.userId,
      postId: post.id,
      category: post.category 
    }, clientIP)

    // 返回创建的帖子
    return NextResponse.json({
      success: true,
      message: '帖子发布成功',
      data: {
        ...post,
        images: JSON.parse(post.images),
        tags: JSON.parse(post.tags)
      }
    })

  } catch (error) {
    const clientIP = getClientIP(request)
    console.error('创建帖子失败:', error)
    logSecurityEvent('POST_CREATE_ERROR', { error: error instanceof Error ? error.message : 'unknown' }, clientIP)
    
    return NextResponse.json(
      { success: false, message: '创建帖子失败，请重试' },
      { status: 500 }
    )
  }
} 