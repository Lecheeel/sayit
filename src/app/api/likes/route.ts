import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Types for like operations
interface LikeCondition {
  userId: string
  postId?: string
  confessionId?: string
  commentId?: string
  marketItemId?: string
  taskId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user } = authenticateRequest(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const { targetId, targetType } = await request.json()

    if (!targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      )
    }

    // 构建查询条件
    const whereCondition: LikeCondition = {
      userId: user.userId
    }

    // 构建创建条件
    const createData: LikeCondition = {
      userId: user.userId
    }

    // 根据类型设置对应的字段
    switch (targetType) {
      case 'post':
        whereCondition.postId = targetId
        createData.postId = targetId
        break
      case 'confession':
        whereCondition.confessionId = targetId
        createData.confessionId = targetId
        break
      case 'comment':
        whereCondition.commentId = targetId
        createData.commentId = targetId
        break
      case 'market':
        whereCondition.marketItemId = targetId
        createData.marketItemId = targetId
        break
      case 'task':
        whereCondition.taskId = targetId
        createData.taskId = targetId
        break
      default:
        return NextResponse.json(
          { success: false, error: '不支持的内容类型' },
          { status: 400 }
        )
    }

    // 检查是否已经点赞
    const existingLike = await prisma.like.findFirst({
      where: whereCondition
    })

    if (existingLike) {
      // 取消点赞
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      })

      return NextResponse.json({
        success: true,
        liked: false,
        message: '取消点赞成功'
      })
    } else {
      // 添加点赞
      await prisma.like.create({
        data: createData
      })

      return NextResponse.json({
        success: true,
        liked: true,
        message: '点赞成功'
      })
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    return NextResponse.json(
      { success: false, error: '点赞操作失败' },
      { status: 500 }
    )
  }
}

// 获取点赞状态
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const targetId = url.searchParams.get('targetId')
    const targetType = url.searchParams.get('targetType')
    
    const { isAuthenticated: isAuth, user: authUser } = authenticateRequest(request)
    
    if (!targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      )
    }

    let isLiked = false
    
    if (isAuth && authUser) {
      // 构建查询条件
      const whereCondition: LikeCondition = {
        userId: authUser.userId
      }

      // 根据类型设置对应的字段
      switch (targetType) {
        case 'post':
          whereCondition.postId = targetId
          break
        case 'confession':
          whereCondition.confessionId = targetId
          break
        case 'comment':
          whereCondition.commentId = targetId
          break
        case 'market':
          whereCondition.marketItemId = targetId
          break
        case 'task':
          whereCondition.taskId = targetId
          break
        default:
          return NextResponse.json(
            { success: false, error: '不支持的内容类型' },
            { status: 400 }
          )
      }

      const existingLike = await prisma.like.findFirst({
        where: whereCondition
      })
      isLiked = !!existingLike
    }

    // 获取总点赞数
    const countCondition: Partial<LikeCondition> = {}
    switch (targetType) {
      case 'post':
        countCondition.postId = targetId
        break
      case 'confession':
        countCondition.confessionId = targetId
        break
      case 'comment':
        countCondition.commentId = targetId
        break
      case 'market':
        countCondition.marketItemId = targetId
        break
      case 'task':
        countCondition.taskId = targetId
        break
    }

    const likeCount = await prisma.like.count({
      where: countCondition
    })

    return NextResponse.json({
      success: true,
      isLiked,
      likeCount
    })
  } catch (error) {
    console.error('获取点赞状态失败:', error)
    return NextResponse.json(
      { success: false, error: '获取点赞状态失败' },
      { status: 500 }
    )
  }
} 