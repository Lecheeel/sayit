'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface FetchOptions {
  endpoint: string
  initialData?: any
  dependencies?: any[]
  enabled?: boolean
  autoRefresh?: number // 自动刷新间隔（毫秒）
  transform?: (data: any) => any // 数据转换函数
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

interface PaginationOptions extends FetchOptions {
  page?: number
  limit?: number
  category?: string
  search?: string
}

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setData: (data: T | null) => void
}

interface PaginatedFetchState<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  } | null
  loading: boolean
  error: string | null
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setData: (data: T[]) => void
  setPage: (page: number) => void
  setCategory: (category: string) => void
  setSearch: (search: string) => void
}

// 基础数据获取Hook
export function useDataFetcher<T>({
  endpoint,
  initialData = null,
  dependencies = [],
  enabled = true,
  autoRefresh,
  transform,
  onSuccess,
  onError
}: FetchOptions): FetchState<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '获取数据失败')
      }

      // 根据不同的API响应格式提取数据
      let processedData = result.data
      if (!processedData) {
        // 兼容不同API的响应格式
        processedData = result.confession || result.post || result.item || result.task
      }
      
      if (transform) {
        processedData = transform(processedData)
      }

      setData(processedData)
      onSuccess?.(processedData)

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // 请求被取消，不处理错误
      }

      const errorMessage = err instanceof Error ? err.message : '获取数据失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [endpoint, enabled, transform, onSuccess, onError])

  // 设置自动刷新
  useEffect(() => {
    if (autoRefresh && autoRefresh > 0) {
      intervalRef.current = setInterval(fetchData, autoRefresh)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, fetchData])

  // 初始化和依赖更新时获取数据
  useEffect(() => {
    fetchData()
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchData, ...dependencies])

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    setData
  }
}

// 分页数据获取Hook
export function usePaginatedData<T>({
  endpoint,
  initialData = [],
  page = 1,
  limit = 10,
  category = 'all',
  search = '',
  dependencies = [],
  enabled = true,
  transform,
  onSuccess,
  onError
}: PaginationOptions): PaginatedFetchState<T> {
  const [data, setData] = useState<T[]>(initialData)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(page)
  const [currentCategory, setCurrentCategory] = useState(category)
  const [currentSearch, setCurrentSearch] = useState(search)

  const buildUrl = useCallback((pageNum: number, categoryFilter: string, searchQuery: string) => {
    const params = new URLSearchParams()
    params.set('page', pageNum.toString())
    params.set('limit', limit.toString())
    
    if (categoryFilter && categoryFilter !== 'all') {
      params.set('category', categoryFilter)
    }
    
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim())
    }
    
    return `${endpoint}?${params.toString()}`
  }, [endpoint, limit])

  const fetchData = useCallback(async (pageNum: number, categoryFilter: string, searchQuery: string, append = false) => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      const url = buildUrl(pageNum, categoryFilter, searchQuery)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '获取数据失败')
      }

      // 根据不同的API响应格式提取数据
      let processedData = result.data
      if (!processedData) {
        // 兼容不同API的响应格式
        processedData = result.confession || result.post || result.item || result.task
      }
      
      if (transform) {
        processedData = transform(processedData)
      }

      if (append && pageNum > 1) {
        setData(prev => [...prev, ...processedData])
      } else {
        setData(processedData)
      }

      setPagination(result.pagination)
      onSuccess?.(processedData)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [enabled, buildUrl, transform, onSuccess, onError])

  // 初始化和依赖更新时获取数据
  useEffect(() => {
    fetchData(currentPage, currentCategory, currentSearch)
  }, [fetchData, currentPage, currentCategory, currentSearch, ...dependencies])

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchData(1, currentCategory, currentSearch)
    setCurrentPage(1)
  }, [fetchData, currentCategory, currentSearch])

  // 加载更多
  const loadMore = useCallback(async () => {
    if (!pagination || currentPage >= pagination.pages) return
    
    const nextPage = currentPage + 1
    await fetchData(nextPage, currentCategory, currentSearch, true)
    setCurrentPage(nextPage)
  }, [fetchData, pagination, currentPage, currentCategory, currentSearch])

  // 设置页面
  const setPage = useCallback((newPage: number) => {
    setCurrentPage(newPage)
  }, [])

  // 设置分类
  const setCategory = useCallback((newCategory: string) => {
    setCurrentCategory(newCategory)
    setCurrentPage(1) // 重置到第一页
  }, [])

  // 设置搜索
  const setSearch = useCallback((newSearch: string) => {
    setCurrentSearch(newSearch)
    setCurrentPage(1) // 重置到第一页
  }, [])

  const hasMore = pagination ? currentPage < pagination.pages : false

  return {
    data,
    pagination,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    setData,
    setPage,
    setCategory,
    setSearch
  }
}

// 详情页数据获取Hook
export function useDetailData<T>(
  id: string | null,
  endpoint: string,
  options: Omit<FetchOptions, 'endpoint'> = {}
): FetchState<T> {
  const fullEndpoint = id ? `${endpoint}/${id}` : ''
  
  return useDataFetcher<T>({
    ...options,
    endpoint: fullEndpoint,
    enabled: !!id && (options.enabled !== false)
  })
}

// 创建数据的Hook
export function useDataCreator<T>(endpoint: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: any): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '创建失败')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  return {
    create,
    loading,
    error
  }
} 