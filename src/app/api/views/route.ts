import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Types for view record operations
type TargetType = 'post' | 'confession' | 'market' | 'task'

interface ViewWhereCondition {
  createdAt: {
    gte: Date
  }
  postId?: string
  confessionId?: string
  marketItemId?: string
  taskId?: string
  userId?: string | null
  ip?: string
}

interface ViewCreateData {
  userId: string | null
  ip: string
  userAgent: string
  postId?: string
  confessionId?: string
  marketItemId?: string
  taskId?: string
}

// 记录浏览量
export async function POST(request: NextRequest) {
  try {
    const { postId, confessionId, marketItemId, taskId } = await request.json()
    
    // 确定目标类型和ID
    let targetId: string | null = null
    let targetType: string = ''
    
    if (postId) {
      targetId = postId
      targetType = 'post'
    } else if (confessionId) {
      targetId = confessionId
      targetType = 'confession'
    } else if (marketItemId) {
      targetId = marketItemId
      targetType = 'market'
    } else if (taskId) {
      targetId = taskId
      targetType = 'task'
    }
    
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: '内容ID不能为空' },
        { status: 400 }
      )
    }

    // 获取用户信息（可能未登录）
    const { user } = authenticateRequest(request)
    
    // 获取客户端IP和User-Agent
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    // 构建查询条件
    const whereCondition: ViewWhereCondition = {
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // 5分钟内不重复计数
      }
    }

    // 根据类型设置对应的字段
    switch (targetType) {
      case 'post':
        whereCondition.postId = targetId
        break
      case 'confession':
        whereCondition.confessionId = targetId
        break
      case 'market':
        whereCondition.marketItemId = targetId
        break
      case 'task':
        whereCondition.taskId = targetId
        break
    }

    // 添加用户或IP条件
    if (user) {
      whereCondition.userId = user.userId
    } else {
      whereCondition.ip = ip
      whereCondition.userId = null // 明确设置为null
    }

    // 检查是否已经记录过浏览（防刷机制）
    const existingView = await prisma.viewRecord.findFirst({
      where: whereCondition
    })

    if (existingView) {
      return NextResponse.json({
        success: true,
        message: '已记录浏览',
        viewIncremented: false
      })
    }

    // 构建创建数据
    const createData: ViewCreateData = {
      userId: user?.userId || null,
      ip,
      userAgent
    }

    // 根据类型设置对应的字段
    switch (targetType) {
      case 'post':
        createData.postId = targetId
        break
      case 'confession':
        createData.confessionId = targetId
        break
      case 'market':
        createData.marketItemId = targetId
        break
      case 'task':
        createData.taskId = targetId
        break
    }

    // 使用事务同时创建浏览记录和更新浏览量
    try {
      await prisma.$transaction(async (tx) => {
        // 创建浏览记录
        await tx.viewRecord.create({
          data: createData
        })

        // 根据类型更新对应内容的浏览量
        switch (targetType) {
          case 'post':
            await tx.post.update({
              where: { id: targetId },
              data: {
                viewCount: {
                  increment: 1
                }
              }
            })
            break
          case 'confession':
            await tx.confession.update({
              where: { id: targetId },
              data: {
                viewCount: {
                  increment: 1
                }
              }
            })
            break
          case 'market':
            await tx.marketItem.update({
              where: { id: targetId },
              data: {
                viewCount: {
                  increment: 1
                }
              }
            })
            break
          case 'task':
            await tx.task.update({
              where: { id: targetId },
              data: {
                viewCount: {
                  increment: 1
                }
              }
            })
            break
        }
      })

      return NextResponse.json({
        success: true,
        message: '浏览量已更新',
        viewIncremented: true
      })
    } catch (transactionError: unknown) {
      // 如果是重复记录错误，说明已经记录过了，返回成功但不增加浏览量
      if (transactionError && typeof transactionError === 'object' && 'code' in transactionError && (transactionError as { code: string }).code === 'P2002') {
        return NextResponse.json({
          success: true,
          message: '浏览量已记录（重复访问）',
          viewIncremented: false
        })
      }
      
      // 其他错误则抛出
      throw transactionError
    }

  } catch (error) {
    console.error('记录浏览量失败:', error)
    return NextResponse.json(
      { success: false, error: '记录浏览量失败' },
      { status: 500 }
    )
  }
}

// 获取浏览量统计
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const postId = url.searchParams.get('postId')
    const confessionId = url.searchParams.get('confessionId')
    const marketItemId = url.searchParams.get('marketItemId')
    const taskId = url.searchParams.get('taskId')
    
    // 确定目标类型和ID
    let targetId: string | null = null
    let targetType: string = ''
    
    if (postId) {
      targetId = postId
      targetType = 'post'
    } else if (confessionId) {
      targetId = confessionId
      targetType = 'confession'
    } else if (marketItemId) {
      targetId = marketItemId
      targetType = 'market'
    } else if (taskId) {
      targetId = taskId
      targetType = 'task'
    }
    
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: '内容ID不能为空' },
        { status: 400 }
      )
    }

    let content: { viewCount: number } | null = null

    // 根据类型获取对应内容
    switch (targetType) {
      case 'post':
        content = await prisma.post.findUnique({
          where: { id: targetId },
          select: { viewCount: true }
        })
        break
      case 'confession':
        content = await prisma.confession.findUnique({
          where: { id: targetId },
          select: { viewCount: true }
        })
        break
      case 'market':
        content = await prisma.marketItem.findUnique({
          where: { id: targetId },
          select: { viewCount: true }
        })
        break
      case 'task':
        content = await prisma.task.findUnique({
          where: { id: targetId },
          select: { viewCount: true }
        })
        break
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      viewCount: content.viewCount || 0
    })

  } catch (error) {
    console.error('获取浏览量失败:', error)
    return NextResponse.json(
      { success: false, error: '获取浏览量失败' },
      { status: 500 }
    )
  }
} 