'use client'

import { useParams } from 'next/navigation'
import { Heart } from 'lucide-react'
import DetailPageLayout from '@/components/DetailPageLayout'
import CommentSection from '@/components/CommentSection'
import { useDetailData } from '@/lib/useDataFetcher'
import { useViewTrackerEnhanced } from '@/lib/useViewTrackerEnhanced'
import DetailImageGallery from '@/components/DetailImageGallery'
import InteractionStats from '@/components/InteractionStats'

interface ConfessionDetail {
  id: string
  content: string
  images: string[]
  isAnonymous: boolean
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
    views?: number
  }
}

export default function ConfessionDetailPage() {
  const params = useParams()
  const confessionId = params.id as string

  // 使用通用数据获取Hook
  const { data: confession, loading, error } = useDetailData<ConfessionDetail>(
    confessionId,
    '/api/confessions'
  )

  // 使用增强版浏览量追踪Hook
  const viewTrackerRef = useViewTrackerEnhanced({
    targetId: confessionId,
    targetType: 'confession',
    enabled: !!confession && !loading
  })

  return (
    <DetailPageLayout
      // 基础信息
      title={confession?.isAnonymous ? '匿名表白' : '表白墙'}
      content={confession?.content}
      images={confession?.images}
      author={confession?.author}
      createdAt={confession?.createdAt || ''}
      isLoading={loading}
      error={error}
      
      // 页面配置
      pageType="confession"
      pageTitle="表白墙"
      gradientColors="bg-gradient-to-br from-gray-50 via-pink-50/30 to-rose-50/40"
      accentColor="pink"
      errorButtonColor="bg-pink-500 hover:bg-pink-600"
      
      // 统计信息
      targetId={confessionId}
      stats={confession?.stats}
      
      // 特殊配置
      isAnonymous={confession?.isAnonymous}
      viewTrackerRef={viewTrackerRef as React.RefObject<HTMLDivElement>}
      showImages={false} // 关闭自动图片展示
      
      // 头部额外内容
      headerExtra={
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
            表白墙
          </span>
          {confession?.isAnonymous && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              匿名
            </span>
          )}
        </div>
      }
      
      // 自定义内容区域（手动控制图片和评论的顺序）
      customContent={
        confession ? (
          <div className="space-y-6">
            {/* 表白内容 */}
            <div className="prose prose-lg max-w-none">
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <Heart className="text-pink-500 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {confession.content}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 图片展示区域 */}
            {confession.images && confession.images.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <DetailImageGallery 
                  images={confession.images} 
                  alt="表白墙图片"
                />
              </div>
            )}
            
            {/* 交互统计区域 */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-center">
                <InteractionStats
                  targetId={confessionId}
                  targetType="confession"
                  initialStats={{
                    likes: confession.stats.likes,
                    comments: confession.stats.comments,
                    views: confession.stats.views || 0,
                    isLiked: false
                  }}
                  size="lg"
                  variant="horizontal"
                  showLabels={true}
                />
              </div>
            </div>
            
            {/* 评论区域 */}
            <div className="border-t border-gray-200 pt-6">
              <CommentSection
                targetId={confessionId}
                targetType="confession"
                initialCommentCount={confession.stats.comments}
              />
            </div>
          </div>
        ) : null
      }
    />
  )
} 