'use client'

import Link from 'next/link'
import { Heart, MessageCircle, ShoppingBag, DollarSign, Users, Star, Grid3X3, List, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { useToast } from '@/components/Toast'
import FeedList, { FeedItem } from '@/components/FeedList'
import InfiniteScrollContainer from '@/components/InfiniteScrollContainer'
import CreateContentDropdown from '@/components/CreateContentDropdown'

interface User {
  id: string
  username: string
  avatar?: string
  nickname?: string
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'list'>('masonry') // 布局模式状态
  const [searchQuery, setSearchQuery] = useState('') // 搜索查询状态
  const { toast, showToast, hideToast } = useToast()
  const router = useRouter()

  // 检查登录状态
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('解析用户数据失败:', error)
        localStorage.removeItem('user')
      }
    }
  }, [])

  // 恢复用户的布局偏好
  useEffect(() => {
    const savedLayout = localStorage.getItem('feedLayoutMode')
    if (savedLayout === 'list' || savedLayout === 'masonry') {
      setLayoutMode(savedLayout)
    }
  }, [])

  // 加载信息流 - 不管是否登录都可以查看
  useEffect(() => {
    loadFeed(1, true)
  }, [])

  const loadFeed = async (pageNum: number = 1, reset: boolean = false) => {
    setFeedLoading(true)
    try {
      const response = await fetch(`/api/feed?page=${pageNum}&limit=10`)
      const data = await response.json()
      
      if (data.success) {
        if (reset) {
          setFeedItems(data.items || [])
        } else {
          // 合并新数据时进行去重处理
          setFeedItems(prev => {
            const newItems = data.items || []
            const existingIds = new Set(prev.map(item => item.id))
            const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id))
            return [...prev, ...uniqueNewItems]
          })
        }
        setHasMore(data.pagination ? data.pagination.page < data.pagination.pages : false)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('加载信息流失败:', error)
      showToast('加载信息流失败', 'error')
    } finally {
      setFeedLoading(false)
    }
  }



  // 加载更多
  const loadMore = () => {
    if (!feedLoading && hasMore) {
      loadFeed(page + 1, false)
    }
  }



  // 切换布局模式
  const toggleLayoutMode = () => {
    const newMode = layoutMode === 'masonry' ? 'list' : 'masonry'
    setLayoutMode(newMode)
    localStorage.setItem('feedLayoutMode', newMode)
  }

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }



  // 显示信息流界面（登录用户和游客都可以浏览）
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 bg-texture">


        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 移动端搜索框和快速导航 */}
            <div className="lg:hidden mb-4 space-y-3">
              {/* 移动端搜索框 */}
              <div className="px-2">
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative">
                    <Search 
                      size={18} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索内容..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
                      maxLength={100}
                    />
                  </div>
                </form>
              </div>
              
              {/* 快速导航按钮组 */}
              <div className="grid grid-cols-4 gap-1 px-2">
                <Link
                  href="/confessions"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-pink-50 transition-all duration-200 group"
                  title="表白墙"
                >
                  <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center mb-1 group-hover:bg-pink-200 transition-all duration-200">
                    <Heart size={14} className="text-pink-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-pink-600 text-center leading-tight">表白墙</span>
                </Link>
                <Link
                  href="/posts"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-blue-50 transition-all duration-200 group"
                  title="校园圈"
                >
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mb-1 group-hover:bg-blue-200 transition-all duration-200">
                    <MessageCircle size={14} className="text-blue-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 text-center leading-tight">校园圈</span>
                </Link>
                <Link
                  href="/market"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-green-50 transition-all duration-200 group"
                  title="跳蚤市场"
                >
                  <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center mb-1 group-hover:bg-green-200 transition-all duration-200">
                    <ShoppingBag size={14} className="text-green-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-green-600 text-center leading-tight">跳蚤市场</span>
                </Link>
                <Link
                  href="/tasks"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-amber-50 transition-all duration-200 group"
                  title="悬赏任务"
                >
                  <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center mb-1 group-hover:bg-amber-200 transition-all duration-200">
                    <DollarSign size={14} className="text-amber-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-amber-600 text-center leading-tight">悬赏任务</span>
                </Link>
              </div>
            </div>

            {/* 主要内容区域 */}
            <div className="lg:col-span-4">
              {/* 信息流标题和控制按钮 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                {/* <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">校园动态</h1>
                  <p className="text-gray-600">发现校园里的精彩内容</p>
                </div> */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center space-x-3">
                    {/* 布局切换按钮 */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                      <button
                        onClick={toggleLayoutMode}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          layoutMode === 'masonry'
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        title="瀑布流布局"
                      >
                        <Grid3X3 size={16} />
                        <span>瀑布流</span>
                      </button>
                      <button
                        onClick={toggleLayoutMode}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          layoutMode === 'list'
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        title="单列阅读模式"
                      >
                        <List size={16} />
                        <span>单列</span>
                      </button>
                    </div>
                    
                    {/* 发布内容控件 */}
                    <CreateContentDropdown />
                  </div>
                </div>
              </div>

              {/* 信息流内容 */}
              <InfiniteScrollContainer
                hasMore={hasMore}
                loading={feedLoading}
                onLoadMore={loadMore}
                loadingText="正在加载更多精彩内容..."
                noMoreText="暂时没有更多内容了"
                accentColor="indigo"
              >
                <FeedList
                  items={feedItems}
                  loading={feedLoading}
                  layoutMode={layoutMode === 'masonry' ? 'waterfall' : 'list'}
                  emptyMessage="成为第一个分享校园生活的人，让其他同学看到精彩的内容吧！"
                  emptyIcon={<MessageCircle size={32} className="text-gray-400" />}
                  className={
                    layoutMode === 'masonry'
                      ? `columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 lg:gap-6`
                      : `max-w-4xl mx-auto space-y-6`
                  }
                />
              </InfiniteScrollContainer>
            </div>
          </div>
        </div>

        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </div>
    )
}
