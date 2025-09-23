'use client'

import { useState, useEffect, Suspense } from 'react'
import { Heart, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Toast, { useToast } from '@/components/Toast'

import CreatePostDialog from '@/components/CreatePostDialog'
import FeedList, { FeedItem } from '@/components/FeedList'
import InfiniteScrollContainer from '@/components/InfiniteScrollContainer'
import { useAuthContext } from '@/lib/auth-context'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

interface Confession {
  id: string
  content: string
  images: string[]
  isAnonymous: boolean
  createdAt: string
  author: User
  _count: {
    likes: number
    comments: number
  }
}

function ConfessionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [confessions, setConfessions] = useState<Confession[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const { isAuthenticated } = useAuthContext()
  const { toast, showToast, hideToast } = useToast()

  // 检查是否需要自动打开创建对话框
  useEffect(() => {
    const create = searchParams.get('create')
    if (create === 'true' && isAuthenticated) {
      setShowCreateDialog(true)
      // 清除URL参数
      router.replace('/confessions', { scroll: false })
    }
  }, [searchParams, isAuthenticated, router])

  // 获取表白墙内容
  useEffect(() => {
    fetchConfessions(1, true)
  }, [])

  const fetchConfessions = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/confessions?page=${pageNum}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        if (reset) {
          setConfessions(data.confessions || [])
        } else {
          // 合并新数据时进行去重处理
          setConfessions(prev => {
            const newItems = data.confessions || []
            const existingIds = new Set(prev.map(item => item.id))
            const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id))
            return [...prev, ...uniqueNewItems]
          })
        }
        setHasMore(data.pagination ? data.pagination.page < data.pagination.pages : false)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('获取表白墙内容失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchConfessions(page + 1, false)
    }
  }

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      showToast('请登录后操作', 'error')
      setTimeout(() => {
        router.push('/login?redirect=/confessions')
      }, 1500)
      return
    }
    setShowCreateDialog(true)
  }

  const handleCreateSuccess = () => {
    fetchConfessions(1, true) // 刷新列表
  }

  // 转换Confession为FeedItem格式
  const convertToFeedItems = (confessions: Confession[]): FeedItem[] => {
    return confessions.map(confession => ({
      id: confession.id,
      type: 'confession' as const,
      title: '', // 表白墙通常没有标题
      content: confession.content,
      images: confession.images,
      author: {
        id: confession.author.id,
        username: confession.author.username,
        nickname: confession.author.nickname,
        avatar: confession.author.avatar
      },
      createdAt: confession.createdAt,
      isAnonymous: confession.isAnonymous,
      stats: {
        likes: confession._count.likes,
        comments: confession._count.comments
      }
    }))
  }

  const feedItems = convertToFeedItems(confessions)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50">
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Heart className="mr-2 text-pink-500" />
                表白墙
              </h1>
              <p className="text-gray-600 mt-1">匿名表白，传递心声</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg font-medium flex items-center transition"
            >
              <Plus size={20} className="mr-1" />
              发布表白
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <InfiniteScrollContainer
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
          loadingText="正在加载更多表白..."
          noMoreText="暂时没有更多表白了"
          accentColor="pink"
        >
          <FeedList
            items={feedItems}
            loading={loading}
            layoutMode="waterfall"
            showContent={false}
            emptyMessage="成为第一个发布表白的人吧！"
            emptyIcon={<Heart className="mx-auto h-12 w-12 text-gray-400" />}
          />
        </InfiniteScrollContainer>
      </div>

      {/* 创建表白对话框 */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
        type="confession"
      />
    </div>
  )
}

export default function ConfessionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <ConfessionsPageContent />
    </Suspense>
  )
} 