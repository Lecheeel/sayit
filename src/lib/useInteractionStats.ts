import { useState, useEffect, useMemo, useRef } from 'react'
import { recordView } from './utils'

// 互动统计数据接口
interface InteractionStats {
  likes: number
  comments: number
  views: number
  isLiked: boolean
  loading: boolean
}

// 全局缓存，减少重复请求
const statsCache = new Map<string, { data: InteractionStats; timestamp: number }>()
const CACHE_DURATION = 30000 // 30秒缓存

// 正在进行的请求缓存，防止重复请求
const pendingRequests = new Map<string, Promise<InteractionStats>>()

// 获取缓存key
function getCacheKey(targetId: string, targetType: string): string {
  return `${targetType}-${targetId}`
}

// 检查缓存是否有效
function isValidCache(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION
}

// 获取互动统计数据的Hook
export function useInteractionStats(
  targetId: string, 
  targetType: 'post' | 'confession' | 'comment' | 'market' | 'task',
  initialStats?: Partial<InteractionStats>
) {
  const cacheKey = useMemo(() => getCacheKey(targetId, targetType), [targetId, targetType])
  
  const [stats, setStats] = useState<InteractionStats>(() => {
    // 初始化时检查缓存
    const cached = statsCache.get(cacheKey)
    if (cached && isValidCache(cached.timestamp)) {
      return cached.data
    }
    
    return {
      likes: initialStats?.likes || 0,
      comments: initialStats?.comments || 0,
      views: initialStats?.views || 0,
      isLiked: initialStats?.isLiked || false,
      loading: true
    }
  })

  const isMountedRef = useRef(true)

  const fetchStats = async (): Promise<InteractionStats> => {
    const cacheKey = getCacheKey(targetId, targetType)
    
    // 检查缓存
    const cached = statsCache.get(cacheKey)
    if (cached && isValidCache(cached.timestamp)) {
      return cached.data
    }
    
    // 检查是否有正在进行的请求
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)!
    }

    // 创建新的请求
    const requestPromise = (async () => {
      try {
        // 并行获取各种统计数据
        const promises = []

        // 获取点赞状态和数量
        promises.push(
          fetch(`/api/likes?targetId=${targetId}&targetType=${targetType}`)
            .then(res => res.json())
            .catch(() => ({ success: false }))
        )

        // 获取评论数量（仅对帖子和表白墙）
        if (targetType === 'post' || targetType === 'confession') {
          promises.push(
            fetch(`/api/comments?targetId=${targetId}&targetType=${targetType}&limit=1`)
              .then(res => res.json())
              .catch(() => ({ success: false, pagination: { total: 0 } }))
          )
        } else {
          // 对于不支持评论的类型，推入空结果
          promises.push(Promise.resolve({ success: false, pagination: { total: 0 } }))
        }

        // 获取浏览量数据（仅对帖子、表白墙、市场、任务）
        if (['post', 'confession', 'market', 'task'].includes(targetType)) {
          const viewApiPath = targetType === 'post' ? 
            `/api/views?postId=${targetId}` :
            targetType === 'confession' ?
            `/api/views?confessionId=${targetId}` :
            targetType === 'market' ?
            `/api/views?marketItemId=${targetId}` :
            `/api/views?taskId=${targetId}`
          
          promises.push(
            fetch(viewApiPath)
              .then(res => res.json())
              .catch(() => ({ success: false, viewCount: 0 }))
          )
        } else {
          promises.push(Promise.resolve({ success: false, viewCount: 0 }))
        }

        const [likeResult, commentResult, viewResult] = await Promise.all(promises)

        const newStats: InteractionStats = {
          likes: likeResult.success ? likeResult.likeCount : 0,
          isLiked: likeResult.success ? likeResult.isLiked : false,
          comments: commentResult ? (commentResult.success ? commentResult.pagination.total : 0) : 0,
          views: viewResult.success ? viewResult.viewCount : 0,
          loading: false
        }

        // 更新缓存
        statsCache.set(cacheKey, {
          data: newStats,
          timestamp: Date.now()
        })

        return newStats

      } catch (error) {
        console.error('获取互动统计失败:', error)
        const errorStats: InteractionStats = {
          likes: 0,
          comments: 0,
          views: 0,
          isLiked: false,
          loading: false
        }
        
        // 即使出错也缓存结果（较短时间）
        statsCache.set(cacheKey, {
          data: errorStats,
          timestamp: Date.now() - CACHE_DURATION + 5000 // 5秒后过期
        })
        
        return errorStats
      } finally {
        // 移除pending请求
        pendingRequests.delete(cacheKey)
      }
    })()

    // 缓存请求Promise
    pendingRequests.set(cacheKey, requestPromise)
    
    return requestPromise
  }

  useEffect(() => {
    isMountedRef.current = true
    
    if (targetId && targetType) {
      fetchStats().then(newStats => {
        if (isMountedRef.current) {
          setStats(newStats)
        }
      })
    }

    return () => {
      isMountedRef.current = false
    }
  }, [targetId, targetType])

  // 更新点赞状态
  const updateLikeStatus = (liked: boolean, count: number) => {
    const newStats = {
      ...stats,
      isLiked: liked,
      likes: count
    }
    setStats(newStats)
    
    // 更新缓存
    statsCache.set(cacheKey, {
      data: newStats,
      timestamp: Date.now()
    })
  }

  // 更新评论数量
  const updateCommentCount = (count: number) => {
    const newStats = {
      ...stats,
      comments: count
    }
    setStats(newStats)
    
    // 更新缓存
    statsCache.set(cacheKey, {
      data: newStats,
      timestamp: Date.now()
    })
  }

  // 刷新统计数据
  const refreshStats = async () => {
    // 清除缓存强制刷新
    statsCache.delete(cacheKey)
    const newStats = await fetchStats()
    if (isMountedRef.current) {
      setStats(newStats)
    }
  }

  return {
    stats,
    updateLikeStatus,
    updateCommentCount,
    refreshStats
  }
}

// 页面浏览量追踪Hook（优化版）
export function useViewTracking(targetId: string, targetType: 'post' | 'confession' | 'market' | 'task') {
  const [viewRecorded, setViewRecorded] = useState(false)
  const recordedRef = useRef(false)

  // 当targetId或targetType改变时，重置浏览量记录状态
  useEffect(() => {
    setViewRecorded(false)
    recordedRef.current = false
  }, [targetId, targetType])

  useEffect(() => {
    if (!targetId || !targetType || recordedRef.current) return

    // 延迟记录浏览量，确保用户真的在查看内容
    const timer = setTimeout(async () => {
      if (!recordedRef.current) {
        try {
          const result = await recordView(targetId, targetType)
          if (result.success) {
            setViewRecorded(true)
            recordedRef.current = true
          }
        } catch (error) {
          console.error('记录浏览量失败:', error)
        }
      }
    }, 1000) // 1秒后记录

    return () => clearTimeout(timer)
  }, [targetId, targetType])

  return { viewRecorded }
}

// 批量获取统计数据
export async function batchFetchStats(
  items: Array<{ id: string; type: 'post' | 'confession' | 'market' | 'task' }>
): Promise<Map<string, InteractionStats>> {
  const statsMap = new Map<string, InteractionStats>()
  const uncachedItems: typeof items = []

  // 检查缓存
  items.forEach(item => {
    const cacheKey = getCacheKey(item.id, item.type)
    const cached = statsCache.get(cacheKey)
    if (cached && isValidCache(cached.timestamp)) {
      statsMap.set(item.id, cached.data)
    } else {
      uncachedItems.push(item)
    }
  })

  // 如果所有数据都有缓存，直接返回
  if (uncachedItems.length === 0) {
    return statsMap
  }

  try {
    // 批量获取未缓存的数据
    const response = await fetch('/api/stats/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: uncachedItems })
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        result.data.forEach((stats: any) => {
          const item = { ...stats, loading: false }
          statsMap.set(stats.targetId, item)
          
          // 更新缓存
          const cacheKey = getCacheKey(stats.targetId, stats.targetType)
          statsCache.set(cacheKey, {
            data: item,
            timestamp: Date.now()
          })
        })
      }
    }
  } catch (error) {
    console.error('批量获取统计数据失败:', error)
  }

  return statsMap
}

// 清理过期缓存
export function clearExpiredStatsCache(): void {
  const now = Date.now()
  for (const [key, value] of statsCache.entries()) {
    if (!isValidCache(value.timestamp)) {
      statsCache.delete(key)
    }
  }
} 