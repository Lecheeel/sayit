'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MessageCircle, ArrowLeft, User, Clock, Tag, Heart, Eye } from 'lucide-react'
import DetailImageGallery from '@/components/DetailImageGallery'
import InteractionStats from '@/components/InteractionStats'
import CommentSection from '@/components/CommentSection'
import { useViewTrackerEnhanced } from '@/lib/useViewTrackerEnhanced'

interface PostDetail {
  id: string
  title: string
  content: string
  images: string[]
  category?: string
  tags: string[]
  createdAt: string
  author: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
  stats: {
    likes: number
    comments: number
    views: number
  }
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 使用增强版浏览量追踪Hook
  const viewTrackerRef = useViewTrackerEnhanced({
    targetId: params.id as string,
    targetType: 'post',
    enabled: !!post && !loading
  })

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${params.id}`)
        if (!response.ok) {
          throw new Error('获取帖子详情失败')
        }
        const data = await response.json()
        if (data.success) {
          setPost(data.post)
        } else {
          setError(data.error || '获取帖子详情失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取帖子详情失败')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPost()
    }
  }, [params.id])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">找不到这篇帖子</h1>
          <p className="text-gray-600 mb-6">{error || '帖子可能已被删除'}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40">
      {/* 主要内容 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* 主帖内容 */}
        <div 
          ref={viewTrackerRef}
          className="w-full mb-6"
        >
          {/* 头部信息 - 标题在最上方 */}
          <div className="pb-6 border-b border-gray-200">
            <div className="mb-4">
              {/* 返回按钮 */}
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span>返回</span>
              </button>

              {/* 分类和标题 */}
              <div className="flex items-center space-x-3 mb-3">
                {post.category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {post.category}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

              {/* 作者信息和统计 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {post.author.avatar ? (
                        <img 
                          src={post.author.avatar} 
                          alt="头像" 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className="font-medium">{post.author.nickname || post.author.username}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={16} />
                    <span>{formatTime(post.createdAt)}</span>
                  </div>
                </div>
                
                {/* 统计信息 */}
                <InteractionStats
                  targetId={post.id}
                  targetType="post"
                  initialStats={{
                    likes: post.stats.likes,
                    comments: post.stats.comments,
                    views: post.stats.views,
                    isLiked: false // 会在组件内部重新获取
                  }}
                  size="sm"
                  variant="horizontal"
                  showLabels={true}
                />
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="py-6">
            {/* 图片展示 - 使用统一的图片组件 */}
            <DetailImageGallery 
              images={post.images || []} 
              alt="帖子图片"
            />

            {/* 文字内容 - 位于下方 */}
            <div className="prose prose-lg max-w-none mb-6">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                {post.content}
              </p>
            </div>

            {/* 标签 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100"
                  >
                    <Tag size={14} className="mr-1.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 底部操作区 */}
          <div className="py-6 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-center">
              <InteractionStats
                targetId={post.id}
                targetType="post"
                initialStats={{
                  likes: post.stats.likes,
                  comments: post.stats.comments,
                  views: post.stats.views,
                  isLiked: false // 会在组件内部重新获取
                }}
                size="lg"
                variant="horizontal"
                showLabels={true}
              />
            </div>
          </div>
        </div>

        {/* 评论区域 */}
        <CommentSection
          targetId={post.id}
          targetType="post"
          initialCommentCount={post.stats.comments}
        />
      </div>
    </div>
  )
} 