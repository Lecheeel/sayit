// 通用页面数据钩子 - 抽象重复的数据获取逻辑
'use client'

import { useState, useEffect, useCallback } from 'react'
import { recordView } from './utils'

// 通用分页响应接口
interface PaginationResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  error?: string
}

// 通用数据获取配置
interface UsePageDataOptions {
  endpoint: string
  category?: string
  searchQuery?: string
  tags?: string[]
  sortBy?: string
  limit?: number
  additionalParams?: Record<string, string>
  // 可选：用于记录浏览量的目标信息（仅在详情页使用）
  viewTargetId?: string
  viewTargetType?: 'post' | 'confession' | 'market' | 'task'
}

interface PageData {
  viewRecorded: boolean
}

// 通用数据获取钩子
export function usePageData<T>(options: UsePageDataOptions) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PageData>({
    viewRecorded: false
  })

  // 构建API URL
  const buildUrl = useCallback((currentPage: number) => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: (options.limit || 10).toString(),
    })

    if (options.category && options.category !== 'all') {
      params.append('category', options.category)
    }
    if (options.searchQuery) {
      params.append('search', options.searchQuery)
    }
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','))
    }
    if (options.sortBy) {
      params.append('sortBy', options.sortBy)
    }

    // 添加额外参数
    if (options.additionalParams) {
      Object.entries(options.additionalParams).forEach(([key, value]) => {
        params.append(key, value)
      })
    }

    return `${options.endpoint}?${params.toString()}`
  }, [options])

  // 获取数据
  const fetchData = useCallback(async (currentPage: number = 1, append: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      const url = buildUrl(currentPage)
      console.log('Fetching data from:', url)
      
      const response = await fetch(url)
      const result: PaginationResponse<T> = await response.json()

      if (result.success) {
        setItems(prev => append ? [...prev, ...result.data] : result.data)
        setPage(currentPage)
        setHasMore(currentPage < result.pagination.pages)
      } else {
        setError(result.error || '加载失败')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  // 加载更多
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchData(page + 1, true)
    }
  }, [fetchData, loading, hasMore, page])

  // 重置数据（搜索、筛选等场景）
  const resetData = useCallback(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setError(null)
  }, [])

  // 记录浏览量
  const trackView = async () => {
    if (data.viewRecorded) return
    // 只有在提供了明确的目标 ID 和 类型时才记录浏览量
    if (!options.viewTargetId || !options.viewTargetType) return

    try {
      const result = await recordView(options.viewTargetId, options.viewTargetType)
      if (result.success) {
        setData(prev => ({ ...prev, viewRecorded: true }))
      }
    } catch (error) {
      console.error('记录浏览量失败:', error)
    }
  }

  useEffect(() => {
    if (options.viewTargetId && options.viewTargetType) {
      // 延迟记录浏览量，确保用户真的在查看内容
      const timer = setTimeout(() => {
        trackView()
      }, 1000) // 1秒后记录

      return () => clearTimeout(timer)
    }
  }, [options.viewTargetId, options.viewTargetType])

  return {
    items,
    loading,
    hasMore,
    error,
    page,
    fetchData,
    loadMore,
    resetData,
    ...data,
    trackView
  }
}

// 帖子数据钩子
export function usePostsData(category?: string) {
  return usePageData({
    endpoint: '/api/posts',
    category,
    additionalParams: {}
  })
}

// 表白数据钩子
export function useConfessionsData() {
  return usePageData({
    endpoint: '/api/confessions',
    additionalParams: {}
  })
}

// 商品数据钩子
export function useMarketData(category?: string) {
  return usePageData({
    endpoint: '/api/market',
    category,
    additionalParams: {}
  })
}

// 任务数据钩子
export function useTasksData(category?: string) {
  return usePageData({
    endpoint: '/api/tasks',
    category,
    additionalParams: {}
  })
}

// 搜索数据钩子
export function useSearchData(query: string, type?: string) {
  return usePageData({
    endpoint: '/api/search',
    searchQuery: query,
    additionalParams: {
      ...(type && { type })
    }
  })
}

// 订阅数据变化钩子（用于实时更新）
export function useDataSubscription<T>(
  dataHook: () => ReturnType<typeof usePageData<T>>,
  subscriptionKey: string
) {
  const dataResult = dataHook()
  
  useEffect(() => {
    // 监听数据变化事件
    const handleDataChange = () => {
      dataResult.fetchData(1)
    }

    // 添加事件监听器
    window.addEventListener(`${subscriptionKey}-updated`, handleDataChange)
    
    return () => {
      window.removeEventListener(`${subscriptionKey}-updated`, handleDataChange)
    }
  }, [subscriptionKey, dataResult])

  return dataResult
}

// 触发数据更新事件
export function triggerDataUpdate(eventName: string, data?: any) {
  const event = new CustomEvent(eventName, { detail: data })
  window.dispatchEvent(event)
}

// 获取互动统计数据的Hook
export function useInteractionStats(targetId: string, targetType: 'post' | 'confession' | 'comment') {
  const [stats, setStats] = useState({
    likes: 0,
    comments: 0,
    views: 0,
    isLiked: false,
    loading: true
  })

  const fetchStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }))

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
      }

      // 获取浏览量
      promises.push(
        fetch(`/api/views?targetId=${targetId}&targetType=${targetType}`)
          .then(res => res.json())
          .catch(() => ({ success: false, viewCount: 0 }))
      )

      const [likeResult, commentResult, viewResult] = await Promise.all(promises)

      setStats(prev => ({
        ...prev,
        likes: likeResult.success ? likeResult.likeCount : 0,
        isLiked: likeResult.success ? likeResult.isLiked : false,
        comments: commentResult ? (commentResult.success ? commentResult.pagination.total : 0) : 0,
        views: viewResult.success ? viewResult.viewCount : 0,
        loading: false
      }))

    } catch (error) {
      console.error('获取互动统计失败:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    if (targetId && targetType) {
      fetchStats()
    }
  }, [targetId, targetType])

  // 更新点赞状态
  const updateLikeStatus = (liked: boolean, count: number) => {
    setStats(prev => ({
      ...prev,
      isLiked: liked,
      likes: count
    }))
  }

  // 更新评论数量
  const updateCommentCount = (count: number) => {
    setStats(prev => ({
      ...prev,
      comments: count
    }))
  }

  return {
    stats,
    updateLikeStatus,
    updateCommentCount,
    refreshStats: fetchStats
  }
}

// 导出类型
export type { PaginationResponse, UsePageDataOptions } 