import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Types for task query conditions
interface TaskWhereCondition {
  deletedAt: null
  status: 'OPEN'
  category?: string
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const category = url.searchParams.get('category')
    const skip = (page - 1) * limit

    // 构建查询条件
    const whereCondition: TaskWhereCondition = {
      deletedAt: null,
      status: 'OPEN' // 只显示进行中的任务
    }

    if (category && category !== 'all') {
      whereCondition.category = category
    }

    // 获取任务
    const tasks = await prisma.task.findMany({
      where: whereCondition,
      include: {
        publisher: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        acceptor: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // 获取总数（用于分页）
    const total = await prisma.task.count({
      where: whereCondition
    })

    // 解析图片JSON字符串
    const tasksWithImages = tasks.map(task => ({
      ...task,
      images: JSON.parse(task.images || '[]')
    }))

    return NextResponse.json({
      success: true,
      tasks: tasksWithImages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取任务失败:', error)
    return NextResponse.json(
      { error: '获取任务失败' },
      { status: 500 }
    )
  }
} 