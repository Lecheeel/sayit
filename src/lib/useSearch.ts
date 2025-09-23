import { useState, useEffect, useCallback } from 'react'
import { SearchResponse, SearchParams } from '@/types'

// 防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// 搜索Hook
export function useSearch() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const performSearch = useCallback(async (params: SearchParams): Promise<SearchResponse | null> => {
    if (!params.query?.trim()) {
      setSearchResults(null)
      return null
    }

    setLoading(true)
    setError('')

    try {
      const searchParams = new URLSearchParams({
        q: params.query.trim(),
        page: (params.page || 1).toString(),
        limit: (params.limit || 20).toString(),
        sortBy: params.sortBy || 'createdAt',
        sortOrder: params.sortOrder || 'desc',
        timeRange: params.timeRange || 'all',
        ...(params.timeRange === 'custom' && params.startDate && { startDate: params.startDate }),
        ...(params.timeRange === 'custom' && params.endDate && { endDate: params.endDate })
      })

      const response = await fetch(`/api/search?${searchParams}`)
      const data: SearchResponse = await response.json()

      if (data.success) {
        setSearchResults(data)
        return data
      } else {
        setError('搜索失败，请重试')
        return null
      }
    } catch (err) {
      setError('网络错误，请检查连接')
      console.error('搜索错误:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    searchResults,
    loading,
    error,
    performSearch,
    setSearchResults,
    setError
  }
} 