import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SearchResponse, SearchResult } from '@/types'

// 输入验证和清理函数
function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // 移除危险字符，防止XSS和注入攻击
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // 移除可能的XSS字符
    .replace(/[;\\]/g, '') // 移除SQL注入相关字符
    .substring(0, 100) // 限制长度
}

// 高亮关键词函数
function highlightText(text: string, query: string): string {
  if (!text || !query) return text
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
}

// 检查匹配位置
function getMatchPositions(title: string, content: string, query: string): ('title' | 'content')[] {
  const matches: ('title' | 'content')[] = []
  const lowerQuery = query.toLowerCase()
  
  if (title.toLowerCase().includes(lowerQuery)) {
    matches.push('title')
  }
  if (content.toLowerCase().includes(lowerQuery)) {
    matches.push('content')
  }
  
  return matches
}

// 时间范围过滤
function getDateFilter(timeRange: string, startDate?: string, endDate?: string) {
  const now = new Date()
  
  switch (timeRange) {
    case '7d':
      return {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
    case '30d':
      return {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    case '1y':
      return {
        gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      }
    case 'custom':
      if (startDate && endDate) {
        return {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
      return undefined
    default:
      return undefined
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 获取并验证搜索参数
    const rawQuery = searchParams.get('q')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const timeRange = searchParams.get('timeRange') || 'all'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // 验证和清理搜索查询
    const query = sanitizeSearchInput(rawQuery || '')
    
    if (!query) {
      return NextResponse.json<SearchResponse>({
        success: false,
        results: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        },
        query: '',
        totalResults: 0
      }, { status: 400 })
    }

    // 构建时间过滤条件
    const dateFilter = getDateFilter(timeRange, startDate, endDate)

    // 构建排序条件 - 确保安全的排序字段
    const allowedSortFields = ['createdAt', 'updatedAt']
    const safeSort = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    
    const skip = (page - 1) * limit

    // 搜索表白墙
    const confessions = await prisma.confession.findMany({
      where: {
        content: { contains: query },
        deletedAt: null,
        ...(dateFilter && { createdAt: dateFilter })
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
      orderBy: { [safeSort]: sortOrder },
      take: limit,
      skip: skip
    })

    // 搜索帖子
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } }
        ],
        deletedAt: null,
        ...(dateFilter && { createdAt: dateFilter })
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
      orderBy: { [safeSort]: sortOrder },
      take: limit,
      skip: skip
    })

    // 搜索市场商品
    const marketItems = await prisma.marketItem.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } }
        ],
        deletedAt: null,
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      },
      orderBy: { [safeSort]: sortOrder },
      take: limit,
      skip: skip
    })

    // 搜索任务
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } }
        ],
        deletedAt: null,
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        publisher: {
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
      orderBy: { [safeSort]: sortOrder },
      take: limit,
      skip: skip
    })

    // 转换结果为统一格式
    const results: SearchResult[] = []

    // 处理表白墙结果
    confessions.forEach(confession => {
      const matchIn = getMatchPositions('', confession.content, query)
      results.push({
        id: confession.id,
        type: 'confession',
        title: '表白墙',
        content: confession.content,
        highlightedTitle: '表白墙',
        highlightedContent: highlightText(confession.content, query),
        matchIn,
        images: JSON.parse(confession.images || '[]'),
        author: confession.isAnonymous ? {
          id: 'anonymous',
          username: '匿名用户',
          nickname: '匿名用户'
        } : {
          id: confession.author.id,
          username: confession.author.username,
          nickname: confession.author.nickname || undefined,
          avatar: confession.author.avatar || undefined
        },
        createdAt: confession.createdAt.toISOString(),
        stats: {
          likes: confession._count.likes,
          comments: confession._count.comments
        },
        isAnonymous: confession.isAnonymous
      })
    })

    // 处理帖子结果
    posts.forEach(post => {
      const matchIn = getMatchPositions(post.title, post.content, query)
      results.push({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.content,
        highlightedTitle: highlightText(post.title, query),
        highlightedContent: highlightText(post.content, query),
        matchIn,
        images: JSON.parse(post.images || '[]'),
        author: {
          id: post.author.id,
          username: post.author.username,
          nickname: post.author.nickname || undefined,
          avatar: post.author.avatar || undefined
        },
        createdAt: post.createdAt.toISOString(),
        stats: {
          likes: post._count.likes,
          comments: post._count.comments
        },
        category: post.category || undefined,
        tags: JSON.parse(post.tags || '[]')
      })
    })

    // 处理市场商品结果
    marketItems.forEach(item => {
      const matchIn = getMatchPositions(item.title, item.description, query)
      results.push({
        id: item.id,
        type: 'market',
        title: item.title,
        content: item.description,
        highlightedTitle: highlightText(item.title, query),
        highlightedContent: highlightText(item.description, query),
        matchIn,
        images: JSON.parse(item.images || '[]'),
        author: {
          id: item.seller.id,
          username: item.seller.username,
          nickname: item.seller.nickname || undefined,
          avatar: item.seller.avatar || undefined
        },
        createdAt: item.createdAt.toISOString(),
        price: item.price,
        condition: item.condition,
        status: item.status,
        location: item.location || undefined
      })
    })

    // 处理任务结果
    tasks.forEach(task => {
      const matchIn = getMatchPositions(task.title, task.description, query)
      results.push({
        id: task.id,
        type: 'task',
        title: task.title,
        content: task.description,
        highlightedTitle: highlightText(task.title, query),
        highlightedContent: highlightText(task.description, query),
        matchIn,
        author: {
          id: task.publisher.id,
          username: task.publisher.username,
          nickname: task.publisher.nickname || undefined,
          avatar: task.publisher.avatar || undefined
        },
        createdAt: task.createdAt.toISOString(),
        reward: task.reward,
        deadline: task.deadline?.toISOString(),
        taskStatus: task.status
      })
    })

    // 按照时间排序所有结果
    results.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    // 计算分页信息
    const totalResults = results.length
    const totalPages = Math.ceil(totalResults / limit)

    return NextResponse.json<SearchResponse>({
      success: true,
      results: results.slice(0, limit),
      pagination: {
        page,
        limit,
        total: totalResults,
        pages: totalPages
      },
      query,
      totalResults
    })

  } catch (error) {
    console.error('搜索API错误:', error)
    return NextResponse.json<SearchResponse>({
      success: false,
      results: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      },
      query: '',
      totalResults: 0
    }, { status: 500 })
  }
} 