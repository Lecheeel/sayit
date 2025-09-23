import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const confession = await prisma.confession.findUnique({
      where: {
        id: id,
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
      }
    })

    if (!confession) {
      return NextResponse.json(
        { success: false, error: '找不到这条表白' },
        { status: 404 }
      )
    }

    const formattedConfession = {
      id: confession.id,
      content: confession.content,
      images: JSON.parse(confession.images || '[]'),
      isAnonymous: confession.isAnonymous,
      createdAt: confession.createdAt,
      author: confession.isAnonymous ? {
        id: 'anonymous',
        username: '匿名用户',
        nickname: '匿名用户',
        avatar: null
      } : confession.author,
      stats: {
        likes: confession._count.likes,
        comments: confession._count.comments
      }
    }

    return NextResponse.json({
      success: true,
      confession: formattedConfession
    })
  } catch (error) {
    console.error('获取表白详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取表白详情失败' },
      { status: 500 }
    )
  }
} 