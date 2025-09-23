'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, Clock, ThumbsUp, MessageCircle } from 'lucide-react'
import { SearchResponse, SearchParams } from '@/types'
import InfiniteScrollContainer from '@/components/InfiniteScrollContainer'
import { useDebounce } from '@/lib/useSearch'

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [sortBy, setSortBy] = useState<SearchParams['sortBy']>('createdAt')
  const [sortOrder, setSortOrder] = useState<SearchParams['sortOrder']>('desc')
  const [timeRange, setTimeRange] = useState<SearchParams['timeRange']>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // 使用防抖处理搜索
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // 使用 ref 来避免循环依赖
  const searchParamsRef = useRef({
    query: '',
    sortBy,
    sortOrder,
    timeRange,
    startDate,
    endDate
  })

  // 更新搜索参数引用
  useEffect(() => {
    searchParamsRef.current = {
      query: debouncedSearchQuery,
      sortBy,
      sortOrder,
      timeRange,
      startDate,
      endDate
    }
  }, [debouncedSearchQuery, sortBy, sortOrder, timeRange, startDate, endDate])

  // 搜索函数，不依赖状态
  const performSearch = useCallback(async (
    query: string, 
    currentPage: number = 1, 
    append: boolean = false,
    searchConfig?: {
      sortBy?: string
      sortOrder?: string
      timeRange?: string
      startDate?: string
      endDate?: string
    }
  ) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setLoading(true)
    setError('')

    try {
      const config = searchConfig || searchParamsRef.current
      const params = new URLSearchParams({
        q: query.trim(),
        page: currentPage.toString(),
        limit: '20',
        sortBy: config.sortBy || 'createdAt',
        sortOrder: config.sortOrder || 'desc',
        timeRange: config.timeRange || 'all',
        ...(config.timeRange === 'custom' && config.startDate && { startDate: config.startDate }),
        ...(config.timeRange === 'custom' && config.endDate && { endDate: config.endDate })
      })

      const response = await fetch(`/api/search?${params}`)
      const data: SearchResponse = await response.json()

      if (data.success) {
        if (append) {
          // 使用函数式更新来避免依赖 searchResults
          setSearchResults(prevResults => {
            if (prevResults) {
              return {
                ...data,
                results: [...prevResults.results, ...data.results]
              }
            }
            return data
          })
        } else {
          setSearchResults(data)
        }
        setHasMore(data.pagination.page < data.pagination.pages)
      } else {
        setError('搜索失败，请重试')
      }
    } catch (err) {
      setError('网络错误，请检查连接')
      console.error('搜索错误:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 处理搜索参数变化
  useEffect(() => {
    if (debouncedSearchQuery !== searchParams.get('q')) {
      const params = new URLSearchParams()
      if (debouncedSearchQuery.trim()) {
        params.set('q', debouncedSearchQuery.trim())
      }
      router.replace(`/search?${params}`)
    }
  }, [debouncedSearchQuery, router, searchParams])

  // 监听URL参数变化
  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery)
    }
  }, [searchParams])

  // 当搜索关键词变化时执行搜索
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      setPage(1)
      performSearch(debouncedSearchQuery, 1, false)
    } else {
      setSearchResults(null)
    }
  }, [debouncedSearchQuery])

  // 当筛选条件变化时重新搜索
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      setPage(1)
      performSearch(debouncedSearchQuery, 1, false)
    }
  }, [sortBy, sortOrder, timeRange, startDate, endDate])

  // 加载更多
  const loadMore = useCallback(() => {
    if (!loading && hasMore && debouncedSearchQuery.trim()) {
      const nextPage = page + 1
      setPage(nextPage)
      performSearch(debouncedSearchQuery, nextPage, true)
    }
  }, [loading, hasMore, debouncedSearchQuery, page])

  // 处理搜索提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const params = new URLSearchParams({ q: searchQuery.trim() })
      router.push(`/search?${params}`)
    }
  }

  // 安全的高亮显示搜索结果中的关键词
  const renderHighlightedContent = (content: string, highlighted?: string) => {
    // 注意：这里仍然使用dangerouslySetInnerHTML，但内容已经在API端进行了安全处理
    if (highlighted && highlighted !== content) {
      return <div dangerouslySetInnerHTML={{ __html: highlighted }} />
    }
    return <span>{content}</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        
        {/* 搜索头部 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索内容..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
          </form>

          {/* 过滤器切换 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
          >
            <Filter size={16} />
            <span>筛选和排序</span>
          </button>

          {/* 过滤器面板 */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              
              {/* 排序选项 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    排序方式
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SearchParams['sortBy'])}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="createdAt">时间</option>
                    <option value="likes">点赞数</option>
                    <option value="comments">评论数</option>
                    <option value="views">浏览量</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    排序顺序
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SearchParams['sortOrder'])}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                </div>
              </div>

              {/* 时间范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时间范围
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as SearchParams['timeRange'])}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">全部时间</option>
                  <option value="7d">近7天</option>
                  <option value="30d">近30天</option>
                  <option value="1y">近1年</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {/* 自定义时间范围 */}
              {timeRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始日期
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束日期
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 搜索结果 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {searchResults && (
          <div className="mb-6">
            <p className="text-gray-600 text-sm">
              找到 {searchResults.totalResults} 个结果，搜索关键词：<span className="font-medium">&quot;{searchResults.query}&quot;</span>
            </p>
          </div>
        )}

        {/* 结果列表 */}
        {searchResults && searchResults.results.length > 0 ? (
          <div className="space-y-4">
            <InfiniteScrollContainer
              hasMore={hasMore}
              loading={loading}
              onLoadMore={loadMore}
            >
            {searchResults.results.map((result) => (
              <div key={`${result.type}-${result.id}`} className="bg-white rounded-lg shadow-sm">
                <div className="p-4">
                  
                  {/* 结果类型标识 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.type === 'confession' ? 'bg-pink-100 text-pink-600' :
                        result.type === 'post' ? 'bg-blue-100 text-blue-600' :
                        result.type === 'market' ? 'bg-green-100 text-green-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {result.type === 'confession' ? '表白墙' :
                         result.type === 'post' ? '校园圈' :
                         result.type === 'market' ? '跳蚤市场' : '悬赏任务'}
                      </span>
                      
                      {/* 匹配位置指示 */}
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        {result.matchIn.includes('title') && (
                          <span className="bg-yellow-100 text-yellow-600 px-1 rounded">标题匹配</span>
                        )}
                        {result.matchIn.includes('content') && (
                          <span className="bg-yellow-100 text-yellow-600 px-1 rounded">内容匹配</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                      </div>
                      {result.stats && (
                        <>
                          <div className="flex items-center space-x-1">
                            <ThumbsUp size={12} />
                            <span>{result.stats.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle size={12} />
                            <span>{result.stats.comments}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 标题和内容 */}
                  <h3 className="font-medium text-gray-900 mb-2">
                    {renderHighlightedContent(result.title, result.highlightedTitle)}
                  </h3>
                  
                  <div className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {renderHighlightedContent(result.content, result.highlightedContent)}
                  </div>

                  {/* 作者信息 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {result.author.avatar ? (
                        <img 
                          src={result.author.avatar} 
                          alt="用户头像" 
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            {result.author.nickname?.[0] || result.author.username[0]}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-gray-600">
                        {result.author.nickname || result.author.username}
                      </span>
                    </div>

                    {/* 额外信息 */}
                    <div className="text-xs text-gray-500">
                      {result.type === 'market' && result.price && (
                        <span className="text-green-600 font-medium">¥{result.price}</span>
                      )}
                      {result.type === 'task' && result.reward && (
                        <span className="text-yellow-600 font-medium">悬赏¥{result.reward}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </InfiniteScrollContainer>
          </div>
        ) : searchResults && searchResults.results.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">没有找到相关内容</p>
            <p className="text-sm text-gray-400">尝试使用不同的关键词或调整筛选条件</p>
          </div>
        ) : (
          !loading && searchQuery.trim() && (
            <div className="text-center py-12">
              <Search size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">请输入搜索关键词</p>
            </div>
          )
        )}

        {loading && (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 mt-2">搜索中...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <SearchPageContent />
    </Suspense>
  )
} 