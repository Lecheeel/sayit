'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, User } from 'lucide-react'
import DetailImageGallery from './DetailImageGallery'
import InteractionStats from './InteractionStats'

interface Author {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

interface DetailPageLayoutProps {
  // 基础信息
  title: string
  content?: string
  images?: string[]
  author?: Author
  createdAt: string
  isLoading: boolean
  error?: string | null
  
  // 页面配置
  pageType: 'post' | 'confession' | 'market' | 'task'
  pageTitle: string
  gradientColors: string
  accentColor: string
  errorButtonColor: string
  
  // 统计信息
  targetId: string
  stats?: {
    likes: number
    comments: number
    views?: number
  }
  
  // 自定义区域
  headerExtra?: ReactNode // 头部额外内容（如分类、状态标签）
  priceSection?: ReactNode // 价格/奖励区域
  metaInfo?: ReactNode // 元信息区域（如位置、截止时间）
  contentExtra?: ReactNode // 内容区域额外内容
  actionButtons?: ReactNode // 底部操作按钮
  
  // 特殊配置
  showInteractionStats?: boolean
  showImages?: boolean
  isAnonymous?: boolean
  viewTrackerRef?: React.RefObject<HTMLDivElement>
  
  // 自定义渲染
  customContent?: ReactNode
}

export default function DetailPageLayout({
  title,
  content,
  images = [],
  author,
  createdAt,
  isLoading,
  error,
  pageType,
  pageTitle,
  gradientColors,
  accentColor,
  errorButtonColor,
  targetId,
  stats,
  headerExtra,
  priceSection,
  metaInfo,
  contentExtra,
  actionButtons,
  showInteractionStats = true,
  showImages = true,
  isAnonymous = false,
  viewTrackerRef,
  customContent
}: DetailPageLayoutProps) {
  const router = useRouter()

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

  // 加载状态
  if (isLoading) {
    return (
      <div className={`min-h-screen ${gradientColors} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${accentColor} mx-auto mb-4`}></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className={`min-h-screen ${gradientColors} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">内容未找到</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className={`${errorButtonColor} text-white px-6 py-3 rounded-lg hover:opacity-90 transition-colors`}
          >
            返回上一页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${gradientColors}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div 
          ref={viewTrackerRef}
          className="w-full"
        >
          {/* 头部信息区域 */}
          <div className="pb-6 border-b border-gray-200">
            <div className="mb-4">
              {/* 返回按钮 */}
              <button
                onClick={() => router.back()}
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span>返回</span>
              </button>

              {/* 头部额外内容（分类、状态等） */}
              {headerExtra && (
                <div className="mb-3">
                  {headerExtra}
                </div>
              )}

              {/* 标题 */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>

              {/* 作者信息和价格区域 */}
              <div className="flex items-center justify-between">
                {/* 左侧：作者信息和元数据 */}
                <div className="flex flex-col space-y-2">
                  {/* 作者信息 */}
                  {author && (
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {author.avatar ? (
                            <img 
                              src={author.avatar} 
                              alt="头像" 
                              className="w-full h-full rounded-full object-cover" 
                            />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <span className="font-medium">
                          {isAnonymous ? '匿名用户' : (author.nickname || author.username)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={16} />
                        <span>发布于 {formatTime(createdAt)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* 元信息（位置、截止时间等） */}
                  {metaInfo && (
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      {metaInfo}
                    </div>
                  )}
                </div>

                {/* 右侧：价格/奖励区域 */}
                {priceSection && (
                  <div className="text-right">
                    {priceSection}
                  </div>
                )}
              </div>

              {/* 头部统计信息（仅在没有底部统计时显示） */}
              {showInteractionStats && pageType === 'post' && stats && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <InteractionStats
                    targetId={targetId}
                    targetType={pageType}
                    initialStats={{
                      likes: stats.likes,
                      comments: stats.comments,
                      views: stats.views || 0
                    }}
                    size="sm"
                    variant="horizontal"
                    showLabels={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="py-6">
            {customContent ? (
              customContent
            ) : (
              <>
                {/* 文字内容 */}
                {content && (
                  <div className="prose prose-lg max-w-none mb-6">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                      {content}
                    </p>
                  </div>
                )}

                {/* 额外内容 */}
                {contentExtra && (
                  <div className="mb-6">
                    {contentExtra}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 图片展示区域 */}
          {showImages && images && images.length > 0 && (
            <div className="py-6 border-t border-gray-200">
              <DetailImageGallery 
                images={images} 
                alt={`${pageTitle}图片`}
              />
            </div>
          )}

          {/* 底部操作/统计区域 */}
          <div className="py-6 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between">
                             {/* 交互统计 */}
               {showInteractionStats && pageType !== 'post' && stats && (
                 <InteractionStats
                   targetId={targetId}
                   targetType={pageType}
                   initialStats={{
                     likes: stats.likes,
                     comments: stats.comments,
                     views: stats.views || 0
                   }}
                   showLabels={true}
                   size="md"
                   variant="horizontal"
                 />
               )}

              {/* 自定义操作按钮 */}
              {actionButtons && (
                <div className="flex items-center space-x-4">
                  {actionButtons}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 