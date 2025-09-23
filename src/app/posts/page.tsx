'use client'

import { useState, useEffect, Suspense } from 'react'
import { MessageCircle, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Toast, { useToast } from '@/components/Toast'

import CreatePostDialog from '@/components/CreatePostDialog'
import FeedList, { FeedItem } from '@/components/FeedList'
import { useInfiniteScroll } from '@/lib/useInfiniteScroll'
import { useAuthContext } from '@/lib/auth-context'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  category?: string
  tags: string[]
  createdAt: string
  author: User
  _count: {
    likes: number
    comments: number
  }
}

function PostsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { user, loading: authLoading, isAuthenticated } = useAuthContext()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { toast, showToast, hideToast } = useToast()

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'study', name: '学习' },
    { id: 'life', name: '生活' },
    { id: 'entertainment', name: '娱乐' },
    { id: 'sports', name: '运动' },
    { id: 'food', name: '美食' },
    { id: 'other', name: '其他' }
  ]

  // 检查是否需要自动打开创建对话框
  useEffect(() => {
    const create = searchParams.get('create')
    if (create === 'true' && isAuthenticated) {
      setShowCreateDialog(true)
      // 清除URL参数
      router.replace('/posts', { scroll: false })
    }
  }, [searchParams, isAuthenticated, router])

  // 获取帖子内容
  useEffect(() => {
    fetchPosts()
  }, [selectedCategory])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const url = selectedCategory === 'all' 
        ? '/api/posts' 
        : `/api/posts?category=${selectedCategory}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('获取帖子失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      showToast('请登录后操作', 'error')
      setTimeout(() => {
        router.push('/login?redirect=/posts')
      }, 1500)
      return
    }
    setShowCreateDialog(true)
  }

  const handleCreateSuccess = () => {
    fetchPosts() // 刷新列表
  }

  // 转换Post为FeedItem格式
  const convertToFeedItems = (posts: Post[]): FeedItem[] => {
    return posts.map(post => ({
      id: post.id,
      type: 'post' as const,
      title: post.title,
      content: post.content,
      images: post.images,
      author: {
        id: post.author.id,
        username: post.author.username,
        nickname: post.author.nickname,
        avatar: post.author.avatar
      },
      createdAt: post.createdAt,
      category: post.category,
      tags: post.tags,
      stats: {
        likes: post._count.likes,
        comments: post._count.comments
      }
    }))
  }

  const feedItems = convertToFeedItems(posts)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <MessageCircle className="mr-2 text-blue-500" />
                校园圈
              </h1>
              <p className="text-gray-600 mt-1">分享校园生活，互动交流</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium flex items-center transition"
            >
              <Plus size={20} className="mr-1" />
              发布帖子
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 侧边栏 - 分类 */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">分类</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1">
            <FeedList
              items={feedItems}
              loading={loading}
              layoutMode="masonry"
              showContent={true}
              emptyMessage="成为第一个发布帖子的人吧！"
              emptyIcon={<MessageCircle className="mx-auto h-12 w-12 text-gray-400" />}
            />
          </div>
        </div>
      </div>

      {/* 创建帖子对话框 */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
        type="post"
      />
    </div>
  )
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <PostsPageContent />
    </Suspense>
  )
} 