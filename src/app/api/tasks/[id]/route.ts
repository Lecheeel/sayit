import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: {
        id: id,
        deletedAt: null
      },
      include: {
        publisher: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { success: false, error: '找不到这个任务' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        images: JSON.parse(task.images || '[]'),
        reward: task.reward,
        category: task.category,
        deadline: task.deadline,
        status: task.status,
        createdAt: task.createdAt,
        publisher: task.publisher
      }
    })
  } catch (error) {
    console.error('获取任务详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取任务详情失败' },
      { status: 500 }
    )
  }
} 