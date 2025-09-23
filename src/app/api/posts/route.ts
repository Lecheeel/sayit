import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Types for post query conditions
interface PostWhereCondition {
  deletedAt: null
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
    const whereCondition: PostWhereCondition = {
      deletedAt: null
    }

    if (category && category !== 'all') {
      whereCondition.category = category
    }

    // 获取帖子
    const posts = await prisma.post.findMany({
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

    // 解析 JSON 字段
    const formattedPosts = posts.map((post) => ({
      ...post,
      images: JSON.parse(post.images),
      tags: JSON.parse(post.tags)
    }))

    // 获取总数（用于分页）
    const total = await prisma.post.count({
      where: whereCondition
    })

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取帖子失败:', error)
    return NextResponse.json(
      { error: '获取帖子失败' },
      { status: 500 }
    )
  }
} 