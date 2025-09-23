'use client'

import React, { memo, useMemo, useCallback } from 'react'
import { Heart, MessageCircle, ShoppingBag, DollarSign, Clock, MapPin, Tag, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import InteractionStats from './InteractionStats'
import LikeButton from './LikeButton'

interface FeedItem {
  id: string
  type: 'confession' | 'post' | 'market' | 'task'
  title: string
  content: string
  images?: string[]
  author: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
  createdAt: string
  // 表白墙和帖子的统计数据
  stats?: {
    likes: number
    comments: number
    views?: number
  }
  // 帖子相关
  category?: string
  tags?: string[]
  // 商品相关
  price?: number
  condition?: string
  location?: string
  // 任务相关
  reward?: number
  deadline?: string
  // 匿名相关
  isAnonymous?: boolean
}

interface FeedCardProps {
  item: FeedItem
  layoutMode?: 'masonry' | 'waterfall' | 'list' | 'simple'
  onClick?: () => void
  isAboveFold?: boolean
}

// 卡片图片点击时不显示大图模式，直接进入详情页
const FeedCard = memo(function FeedCard({ 
  item, 
  layoutMode = 'masonry', 
  onClick,
  isAboveFold = false
}: FeedCardProps) {
  // 使用useMemo缓存计算结果
  const typeInfo = useMemo(() => {
    switch (item.type) {
      case 'confession':
        return {
          icon: Heart,
          color: 'text-pink-500 bg-pink-50',
          label: '表白墙'
        }
      case 'post':
        return {
          icon: MessageCircle,
          color: 'text-blue-500 bg-blue-50',
          label: '校园圈'
        }
      case 'market':
        return {
          icon: ShoppingBag,
          color: 'text-green-500 bg-green-50',
          label: '跳蚤市场'
        }
      case 'task':
        return {
          icon: DollarSign,
          color: 'text-yellow-500 bg-yellow-50',
          label: '悬赏任务'
        }
      default:
        return {
          icon: MessageCircle,
          color: 'text-gray-500 bg-gray-50',
          label: '动态'
        }
    }
  }, [item.type])

  const detailUrl = useMemo(() => {
    switch (item.type) {
      case 'confession':
        return `/wall/${item.id}`
      case 'post':
        return `/posts/${item.id}`
      case 'market':
        return `/market/${item.id}`
      case 'task':
        return `/task/${item.id}`
      default:
        return '#'
    }
  }, [item.type, item.id])

  // 使用useCallback缓存函数
  const formatTime = useCallback((dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString()
    }
  }, [])

  const Icon = typeInfo.icon

  // 简化模式的卡片样式
  if (layoutMode === 'simple') {
    return (
      <Link href={detailUrl} className="block group">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-start space-x-4">
            {/* 左侧图片 */}
            {item.images && item.images.length > 0 && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <Image
                  src={item.images[0]}
                  alt={item.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  priority={isAboveFold}
                  loading={isAboveFold ? 'eager' : 'lazy'}
                />
              </div>
            )}
            
            {/* 右侧内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`p-1 rounded ${typeInfo.color} flex-shrink-0`}>
                  <Icon size={12} />
                </div>
                <span className="text-xs text-gray-500">{typeInfo.label}</span>
              </div>
              
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">
                {item.title || (item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content)}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatTime(item.createdAt)}</span>
                
                {/* 统计信息 */}
                {item.stats && (
                  <div className="flex items-center space-x-3">
                    {item.stats.views && (
                      <div className="flex items-center space-x-1">
                        <Eye size={12} />
                        <span>{item.stats.views}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Heart size={12} />
                      <span>{item.stats.likes}</span>
                    </div>
                  </div>
                )}

                {/* 价格或奖励 */}
                {item.type === 'market' && item.price && (
                  <span className="text-sm font-bold text-green-600">¥{item.price}</span>
                )}
                {item.type === 'task' && item.reward && (
                  <span className="text-sm font-bold text-yellow-600">¥{item.reward}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // 复杂模式的卡片样式
  const CardContent = memo(() => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md hover:border-gray-200 transition-all duration-300 w-full">
      <div className="flex flex-col gap-4">
        {/* 头部信息 */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${typeInfo.color} flex-shrink-0`}>
            <Icon size={16} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{typeInfo.label}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{formatTime(item.createdAt)}</span>
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-600">
                {item.isAnonymous ? '匿名用户' : (item.author.nickname || item.author.username)}
              </span>
            </div>
          </div>
        </div>

        {/* 标题和内容 */}
        <div>
          {item.title && (
            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
              {item.title}
            </h3>
          )}
          
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {item.content}
          </p>
        </div>

        {/* 图片网格 */}
        {item.images && item.images.length > 0 && (
          <ImageGrid images={item.images} isAboveFold={isAboveFold} />
        )}

        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center space-x-1"
              >
                <Tag size={10} />
                <span>{tag}</span>
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 商品信息 */}
        {item.type === 'market' && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <span className="text-2xl font-bold text-green-600">¥{item.price}</span>
              {item.condition && (
                <span className="ml-2 text-sm text-gray-600">• {item.condition}</span>
              )}
            </div>
            {item.location && (
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <MapPin size={12} />
                <span>{item.location}</span>
              </div>
            )}
          </div>
        )}

        {/* 任务信息 */}
        {item.type === 'task' && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div>
              <span className="text-2xl font-bold text-yellow-600">¥{item.reward}</span>
              <span className="ml-2 text-sm text-gray-600">奖励</span>
            </div>
            {item.deadline && (
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Clock size={12} />
                <span>截止: {new Date(item.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

                 {/* 底部统计信息 */}
         {item.stats && (
           <div className="flex items-center justify-between pt-2 border-t border-gray-100">
             <InteractionStats 
               targetId={item.id}
               targetType={item.type}
               initialStats={{
                 likes: item.stats.likes,
                 comments: item.stats.comments,
                 views: item.stats.views || 0,
                 isLiked: false
               }}
             />
             
             <LikeButton
               targetId={item.id}
               targetType={item.type}
               initialIsLiked={false}
               initialLikeCount={item.stats.likes}
             />
           </div>
         )}
      </div>
    </div>
  ))

  return onClick ? (
    <div onClick={onClick} className="cursor-pointer">
      <CardContent />
    </div>
  ) : (
    <Link href={detailUrl}>
      <CardContent />
    </Link>
  )
})

// 优化的图片网格组件
const ImageGrid = memo(function ImageGrid({ 
  images, 
  isAboveFold 
}: { 
  images: string[]
  isAboveFold: boolean 
}) {
  const gridLayout = useMemo(() => {
    const count = images.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-2'
    return 'grid-cols-2'
  }, [images.length])

  return (
    <div className={`grid ${gridLayout} gap-2 rounded-lg overflow-hidden`}>
      {images.slice(0, 4).map((image, index) => (
        <div
          key={index}
          className={`relative bg-gray-100 ${
            images.length === 3 && index === 0 ? 'row-span-2' : 'aspect-square'
          }`}
        >
          <Image
            src={image}
            alt={`图片 ${index + 1}`}
            fill
            className="object-cover"
            priority={isAboveFold && index === 0}
            loading={isAboveFold && index === 0 ? 'eager' : 'lazy'}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
          {images.length > 4 && index === 3 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">+{images.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

export default FeedCard