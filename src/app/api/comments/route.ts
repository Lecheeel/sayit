import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, sanitizeInput, validateContent } from '@/lib/auth'

// 创建评论
export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user } = authenticateRequest(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const { content, targetId, targetType, parentId, images } = await request.json()

    // 验证输入
    if (!content || !targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      )
    }

    // 验证目标类型
    if (!['confession', 'post'].includes(targetType)) {
      return NextResponse.json(
        { success: false, error: '不支持的内容类型' },
        { status: 400 }
      )
    }

    // 清理和验证内容
    const cleanContent = sanitizeInput(content)
    const contentValidation = validateContent(cleanContent, 500)
    
    if (!contentValidation.isValid) {
      return NextResponse.json(
        { success: false, error: contentValidation.message },
        { status: 400 }
      )
    }

    // 验证图片数组
    let processedImages: string[] = []
    if (images && Array.isArray(images)) {
      // 限制图片数量
      if (images.length > 9) {
        return NextResponse.json(
          { success: false, error: '最多只能上传9张图片' },
          { status: 400 }
        )
      }
      
      // 验证图片URL格式
      processedImages = images.filter((url: string) => {
        return typeof url === 'string' && 
               (url.startsWith('/uploads/') || url.startsWith('http'))
      })
    }

    // 如果有父评论ID，验证父评论存在
    if (parentId) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentId,
          deletedAt: null,
          ...(targetType === 'confession' && { confessionId: targetId }),
          ...(targetType === 'post' && { postId: targetId })
        }
      })

      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: '回复的评论不存在' },
          { status: 400 }
        )
      }
    }

    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        content: cleanContent,
        images: JSON.stringify(processedImages),
        authorId: user.userId,
        ...(targetType === 'confession' && { confessionId: targetId }),
        ...(targetType === 'post' && { postId: targetId }),
        ...(parentId && { parentId })
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
            replies: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        images: JSON.parse(comment.images || '[]'),
        createdAt: comment.createdAt,
        author: comment.author,
        parentId: comment.parentId,
        stats: {
          likes: comment._count.likes,
          replies: comment._count.replies
        }
      }
    })
  } catch (error) {
    console.error('创建评论失败:', error)
    return NextResponse.json(
      { success: false, error: '创建评论失败' },
      { status: 500 }
    )
  }
}

// 获取评论列表
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const targetId = url.searchParams.get('targetId')
    const targetType = url.searchParams.get('targetType')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const sortBy = url.searchParams.get('sortBy') || 'time' // time, likes
    const skip = (page - 1) * limit

    if (!targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      )
    }

    // 构建查询条件
    const whereCondition: {
      deletedAt: null
      parentId: null
      confessionId?: string
      postId?: string
    } = {
      deletedAt: null,
      parentId: null // 只获取顶级评论
    }

    if (targetType === 'confession') {
      whereCondition.confessionId = targetId
    } else if (targetType === 'post') {
      whereCondition.postId = targetId
    }

    // 构建排序条件
    let orderBy: { createdAt?: 'desc', likes?: { _count: 'desc' } } | Array<{ createdAt?: 'desc', likes?: { _count: 'desc' } }> = { createdAt: 'desc' }
    if (sortBy === 'likes') {
      orderBy = [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' }
      ]
    }

    // 获取评论列表
    const comments = await prisma.comment.findMany({
      where: whereCondition,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        replies: {
          where: {
            deletedAt: null
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
                likes: true
              }
            }
          },
          orderBy: { createdAt: 'asc' },
          take: 3 // 每个评论最多显示3个回复
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    })

    // 获取总数
    const total = await prisma.comment.count({
      where: whereCondition
    })

    return NextResponse.json({
      success: true,
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        images: JSON.parse(comment.images || '[]'),
        createdAt: comment.createdAt,
        author: comment.author,
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          images: JSON.parse(reply.images || '[]'),
          createdAt: reply.createdAt,
          author: reply.author,
          stats: {
            likes: reply._count.likes
          }
        })),
        stats: {
          likes: comment._count.likes,
          replies: comment._count.replies
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取评论列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取评论列表失败' },
      { status: 500 }
    )
  }
} 