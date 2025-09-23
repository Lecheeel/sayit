import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let contents: any[] = []

    // 根据类型获取不同的内容
    if (type === 'all' || type === 'confession') {
      const confessions = await prisma.confession.findMany({
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'confession' ? offset : 0,
        take: type === 'confession' ? limit : undefined
      })

      contents.push(...confessions.map(item => ({
        id: item.id,
        type: 'confession',
        content: item.content,
        author: item.author,
        createdAt: item.createdAt.toISOString(),
        viewCount: item.viewCount,
        likesCount: item._count.likes,
        commentsCount: item._count.comments
      })))
    }

    if (type === 'all' || type === 'post') {
      const posts = await prisma.post.findMany({
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'post' ? offset : 0,
        take: type === 'post' ? limit : undefined
      })

      contents.push(...posts.map(item => ({
        id: item.id,
        type: 'post',
        title: item.title,
        content: item.content,
        author: item.author,
        createdAt: item.createdAt.toISOString(),
        viewCount: item.viewCount,
        likesCount: item._count.likes,
        commentsCount: item._count.comments
      })))
    }

    if (type === 'all' || type === 'market') {
      const marketItems = await prisma.marketItem.findMany({
        where: { deletedAt: null },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          },
          _count: {
            select: {
              likes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'market' ? offset : 0,
        take: type === 'market' ? limit : undefined
      })

      contents.push(...marketItems.map(item => ({
        id: item.id,
        type: 'market',
        title: item.title,
        content: item.description,
        author: item.seller,
        createdAt: item.createdAt.toISOString(),
        viewCount: item.viewCount,
        likesCount: item._count.likes,
        commentsCount: 0
      })))
    }

    if (type === 'all' || type === 'task') {
      const tasks = await prisma.task.findMany({
        where: { deletedAt: null },
        include: {
          publisher: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          },
          _count: {
            select: {
              likes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'task' ? offset : 0,
        take: type === 'task' ? limit : undefined
      })

      contents.push(...tasks.map(item => ({
        id: item.id,
        type: 'task',
        title: item.title,
        content: item.description,
        author: item.publisher,
        createdAt: item.createdAt.toISOString(),
        viewCount: item.viewCount,
        likesCount: item._count.likes,
        commentsCount: 0
      })))
    }

    // 如果是获取全部内容，按创建时间排序并分页
    if (type === 'all') {
      contents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      contents = contents.slice(offset, offset + limit)
    }

    return NextResponse.json(contents)
    
  } catch (error) {
    console.error('获取管理员内容列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取内容列表失败' },
      { status: 500 }
    )
  }
} 