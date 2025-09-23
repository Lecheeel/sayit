import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // 获取表白内容
    const confessions = await prisma.confession.findMany({
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
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // 解析图片 JSON 字符串
    const formattedConfessions = confessions.map((confession) => ({
      ...confession,
      images: JSON.parse(confession.images)
    }))

    // 获取总数（用于分页）
    const total = await prisma.confession.count({
      where: {
        deletedAt: null
      }
    })

    return NextResponse.json({
      success: true,
      confessions: formattedConfessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取表白内容失败:', error)
    return NextResponse.json(
      { error: '获取表白内容失败' },
      { status: 500 }
    )
  }
} 