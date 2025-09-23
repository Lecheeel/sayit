import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const post = await prisma.post.findUnique({
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

    if (!post) {
      return NextResponse.json(
        { success: false, error: '找不到这篇帖子' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        images: JSON.parse(post.images || '[]'),
        category: post.category,
        tags: JSON.parse(post.tags || '[]'),
        createdAt: post.createdAt,
        author: post.author,
        stats: {
          likes: post._count.likes,
          comments: post._count.comments,
          views: post.viewCount || 0
        }
      }
    })
  } catch (error) {
    console.error('获取帖子详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取帖子详情失败' },
      { status: 500 }
    )
  }
} 