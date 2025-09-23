import { prisma } from './prisma'

// 并行数据获取配置
interface ParallelFetchConfig {
  userId?: string
  limit?: number
  page?: number
  category?: string
}

// 统计数据类型
interface StatsData {
  likes: number
  comments: number
  views: number
  isLiked: boolean
}

// 并行获取多个内容的统计数据
export async function fetchContentStatsParallel(
  items: Array<{ id: string; type: 'post' | 'confession' | 'market' | 'task' }>,
  userId?: string
): Promise<Map<string, StatsData>> {
  const statsMap = new Map<string, StatsData>()
  
  if (items.length === 0) return statsMap

  try {
    // 按类型分组
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = []
      acc[item.type].push(item.id)
      return acc
    }, {} as Record<string, string[]>)

    // 并行获取所有统计数据
    const promises: Promise<any>[] = []

    // 获取点赞数据
    if (Object.keys(groupedItems).length > 0) {
      for (const [type, ids] of Object.entries(groupedItems)) {
        // 点赞数量查询
        const likeField = type === 'post' ? 'postId' : 
                         type === 'confession' ? 'confessionId' : 
                         type === 'market' ? 'marketItemId' : 'taskId'
        
        promises.push(
          prisma.like.groupBy({
            by: [likeField as any],
            where: {
              [likeField]: { in: ids }
            },
            _count: { id: true }
          }).then(result => ({ type: 'likes', field: likeField, data: result }))
        )

        // 用户点赞状态查询（如果有用户ID）
        if (userId) {
          promises.push(
            prisma.like.findMany({
              where: {
                [likeField]: { in: ids },
                userId
              },
              select: { [likeField]: true }
            }).then(result => ({ type: 'userLikes', field: likeField, data: result }))
          )
        }

        // 评论数量查询（仅对支持评论的类型）
        if (type === 'post' || type === 'confession') {
          const commentField = type === 'post' ? 'postId' : 'confessionId'
          promises.push(
            prisma.comment.groupBy({
              by: [commentField as any],
              where: {
                [commentField]: { in: ids },
                deletedAt: null
              },
              _count: { id: true }
            }).then(result => ({ type: 'comments', field: commentField, data: result }))
          )
        }

        // 浏览量查询
        if (['post', 'confession', 'market', 'task'].includes(type)) {
          const viewField = type === 'post' ? 'postId' : 
                           type === 'confession' ? 'confessionId' : 
                           type === 'market' ? 'marketItemId' : 'taskId'
          
          promises.push(
            prisma.viewRecord.groupBy({
              by: [viewField],
              where: {
                [viewField]: { in: ids }
              },
              _count: { id: true }
            }).then(result => ({ type: 'views', field: viewField, data: result }))
          )
        }
      }
    }

    // 等待所有查询完成
    const results = await Promise.all(promises)

    // 初始化所有项目的统计数据
    items.forEach(item => {
      statsMap.set(item.id, {
        likes: 0,
        comments: 0,
        views: 0,
        isLiked: false
      })
    })

    // 处理查询结果
    const userLikedItems = new Set<string>()
    
    results.forEach(result => {
      switch (result.type) {
        case 'likes':
          result.data.forEach((item: any) => {
            const targetId = item[result.field]
            const stats = statsMap.get(targetId)
            if (stats) {
              stats.likes = item._count.id
            }
          })
          break
          
        case 'userLikes':
          result.data.forEach((item: any) => {
            const targetId = item[result.field]
            userLikedItems.add(targetId)
          })
          break
          
        case 'comments':
          result.data.forEach((item: any) => {
            const targetId = item[result.field]
            const stats = statsMap.get(targetId)
            if (stats) {
              stats.comments = item._count.id
            }
          })
          break
          
        case 'views':
          result.data.forEach((item: any) => {
            const targetId = item[result.field]
            const stats = statsMap.get(targetId)
            if (stats) {
              stats.views = item._count.id
            }
          })
          break
      }
    })

    // 设置用户点赞状态
    userLikedItems.forEach(targetId => {
      const stats = statsMap.get(targetId)
      if (stats) {
        stats.isLiked = true
      }
    })

  } catch (error) {
    console.error('并行获取统计数据失败:', error)
  }

  return statsMap
}

// 并行获取Feed数据
export async function fetchFeedDataParallel(config: ParallelFetchConfig = {}) {
  const { limit = 20, page = 1, category } = config
  const skip = (page - 1) * limit

  try {
    // 并行查询所有板块的内容
    const [confessions, posts, marketItems, tasks] = await Promise.all([
      // 表白墙内容
      prisma.confession.findMany({
        where: { 
          deletedAt: null,
          ...(category && category !== 'all' ? { category } : {})
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      // 校园圈帖子
      prisma.post.findMany({
        where: { 
          deletedAt: null,
          ...(category && category !== 'all' ? { category } : {})
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      // 跳蚤市场商品
      prisma.marketItem.findMany({
        where: { 
          deletedAt: null,
          status: 'AVAILABLE',
          ...(category && category !== 'all' ? { category } : {})
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      // 悬赏任务
      prisma.task.findMany({
        where: { 
          deletedAt: null,
          status: 'OPEN',
          ...(category && category !== 'all' ? { category } : {})
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
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      })
    ])

    // 收集所有内容项
    const allItems = [
      ...confessions.map(item => ({ id: item.id, type: 'confession' as const })),
      ...posts.map(item => ({ id: item.id, type: 'post' as const })),
      ...marketItems.map(item => ({ id: item.id, type: 'market' as const })),
      ...tasks.map(item => ({ id: item.id, type: 'task' as const }))
    ]

    // 并行获取统计数据
    const statsMap = await fetchContentStatsParallel(allItems, config.userId)

    // 格式化返回数据
    const formatFeedItems = (items: any[], type: string, statsMap: Map<string, StatsData>) => {
      return items.map(item => ({
        ...item,
        type,
        images: JSON.parse(item.images || '[]'),
        tags: type === 'post' ? JSON.parse(item.tags || '[]') : undefined,
        stats: statsMap.get(item.id) || { likes: 0, comments: 0, views: 0, isLiked: false }
      }))
    }

    return {
      confessions: formatFeedItems(confessions, 'confession', statsMap),
      posts: formatFeedItems(posts, 'post', statsMap),
      marketItems: formatFeedItems(marketItems, 'market', statsMap),
      tasks: formatFeedItems(tasks, 'task', statsMap)
    }

  } catch (error) {
    console.error('并行获取Feed数据失败:', error)
    throw error
  }
}

// 并行获取单个内容的详细信息
export async function fetchContentDetailParallel(
  id: string, 
  type: 'post' | 'confession' | 'market' | 'task',
  userId?: string
) {
  try {
    const promises: Promise<any>[] = []

    // 获取内容详情
    switch (type) {
      case 'post':
        promises.push(
          prisma.post.findUnique({
            where: { id },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                  avatar: true
                }
              }
            }
          })
        )
        break
      case 'confession':
        promises.push(
          prisma.confession.findUnique({
            where: { id },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                  avatar: true
                }
              }
            }
          })
        )
        break
      case 'market':
        promises.push(
          prisma.marketItem.findUnique({
            where: { id },
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                  avatar: true
                }
              }
            }
          })
        )
        break
      case 'task':
        promises.push(
          prisma.task.findUnique({
            where: { id },
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
        )
        break
    }

    // 并行获取统计数据
    const statsPromise = fetchContentStatsParallel([{ id, type }], userId)

    // 等待所有查询完成
    const [content, statsMap] = await Promise.all([
      promises[0],
      statsPromise
    ])

    if (!content) {
      return null
    }

    return {
      ...content,
      images: JSON.parse(content.images || '[]'),
      tags: type === 'post' ? JSON.parse(content.tags || '[]') : undefined,
      stats: statsMap.get(id) || { likes: 0, comments: 0, views: 0, isLiked: false }
    }

  } catch (error) {
    console.error('并行获取内容详情失败:', error)
    throw error
  }
} 