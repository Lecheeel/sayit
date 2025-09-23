'use client'

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Eye, Share2 } from 'lucide-react'
import { useAuthContext } from '@/lib/auth-context'
import Toast, { useToast } from './Toast'

interface InteractionStatsProps {
  targetId: string
  targetType: 'post' | 'confession' | 'comment' | 'market' | 'task'
  initialStats?: {
    likes: number
    comments: number
    views: number
    isLiked?: boolean
  }
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'horizontal' | 'vertical'
  onStatsChange?: (stats: any) => void
}

// 格式化数字显示
const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

export default function InteractionStats({
  targetId,
  targetType,
  initialStats = { likes: 0, comments: 0, views: 0, isLiked: false },
  showLabels = false,
  size = 'md',
  variant = 'horizontal',
  onStatsChange
}: InteractionStatsProps) {
  const { isAuthenticated } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(initialStats)
  const { toast, showToast, hideToast } = useToast()

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const promises = []

      // 获取点赞数据
      if (['post', 'confession', 'comment', 'market', 'task'].includes(targetType)) {
        promises.push(
          fetch(`/api/likes?targetId=${targetId}&targetType=${targetType}`)
            .then(res => res.json())
            .catch(() => ({ success: false, likeCount: 0, isLiked: false }))
        )
      } else {
        promises.push(Promise.resolve({ success: false, likeCount: 0, isLiked: false }))
      }

      // 获取评论数据
      if (['post', 'confession'].includes(targetType)) {
        promises.push(
          fetch(`/api/comments?targetId=${targetId}&targetType=${targetType}&limit=1`)
            .then(res => res.json())
            .catch(() => ({ success: false, pagination: { total: 0 } }))
        )
      } else {
        promises.push(Promise.resolve({ success: false, pagination: { total: 0 } }))
      }

      // 获取浏览量数据
      if (['post', 'confession', 'market', 'task'].includes(targetType)) {
        const viewApiPath = targetType === 'post' ? 
          `/api/views?postId=${targetId}` :
          targetType === 'confession' ?
          `/api/views?confessionId=${targetId}` :
          targetType === 'market' ?
          `/api/views?marketItemId=${targetId}` :
          `/api/views?taskId=${targetId}`
        
        promises.push(
          fetch(viewApiPath)
            .then(res => res.json())
            .catch(() => ({ success: false, viewCount: 0 }))
        )
      } else {
        promises.push(Promise.resolve({ success: false, viewCount: 0 }))
      }

      const [likeResult, commentResult, viewResult] = await Promise.all(promises)

      const newStats = {
        likes: likeResult.success ? likeResult.likeCount : 0,
        isLiked: likeResult.success ? likeResult.isLiked : false,
        comments: commentResult.success ? commentResult.pagination.total : 0,
        views: viewResult.success ? viewResult.viewCount : 0
      }

      setStats(newStats)
      onStatsChange?.(newStats)

    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  useEffect(() => {
    if (targetId && targetType) {
      fetchStats()
    }
  }, [targetId, targetType])

  // 处理点赞
  const handleLike = async () => {
    if (!isAuthenticated) {
      showToast('请先登录后再点赞', 'warning')
      return
    }

    if (loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetId,
          targetType
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const newIsLiked = data.liked
          const newCount = newIsLiked ? stats.likes + 1 : stats.likes - 1
          
          const newStats = {
            ...stats,
            isLiked: newIsLiked,
            likes: newCount
          }
          
          setStats(newStats)
          onStatsChange?.(newStats)
        }
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      showToast('点赞操作失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 获取尺寸样式
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 14,
          text: 'text-xs',
          gap: 'gap-1'
        }
      case 'lg':
        return {
          icon: 20,
          text: 'text-base',
          gap: 'gap-2'
        }
      default:
        return {
          icon: 16,
          text: 'text-sm',
          gap: 'gap-1.5'
        }
    }
  }

  const sizeStyles = getSizeStyles()
  const containerClass = variant === 'vertical' ? 'flex flex-col space-y-2' : `flex items-center space-x-4`

  return (
    <>
      <div className={containerClass}>
        {/* 点赞按钮 */}
        <button
          onClick={handleLike}
          disabled={loading}
          className={`
            flex items-center ${sizeStyles.gap} transition-all duration-200 hover:scale-105
            ${stats.isLiked 
              ? 'text-pink-500' 
              : 'text-gray-500 hover:text-pink-500'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={stats.isLiked ? '取消点赞' : '点赞'}
        >
          <Heart 
            size={sizeStyles.icon} 
            className={`transition-all duration-200 ${
              stats.isLiked ? 'fill-current' : ''
            }`}
          />
          <span className={`font-medium ${sizeStyles.text}`}>
            {formatNumber(stats.likes)}
          </span>
          {showLabels && (
            <span className={`${sizeStyles.text} text-gray-400`}>
              点赞
            </span>
          )}
        </button>

        {/* 评论数 */}
        {(targetType === 'post' || targetType === 'confession') && (
          <div className={`flex items-center ${sizeStyles.gap} text-gray-500`}>
            <MessageCircle size={sizeStyles.icon} />
            <span className={`font-medium ${sizeStyles.text}`}>
              {formatNumber(stats.comments)}
            </span>
            {showLabels && (
              <span className={`${sizeStyles.text} text-gray-400`}>
                评论
              </span>
            )}
          </div>
        )}

        {/* 浏览量 */}
        {['post', 'confession', 'market', 'task'].includes(targetType) && (
          <div className={`flex items-center ${sizeStyles.gap} text-gray-400`}>
            <Eye size={sizeStyles.icon} />
            <span className={`font-medium ${sizeStyles.text}`}>
              {formatNumber(stats.views)}
            </span>
            {showLabels && (
              <span className={`${sizeStyles.text} text-gray-400`}>
                浏览
              </span>
            )}
          </div>
        )}

        {/* 分享按钮（可选） */}
        {/* <button
          className={`flex items-center ${sizeStyles.gap} text-gray-500 hover:text-blue-500 transition-colors`}
          title="分享"
        >
          <Share2 size={sizeStyles.icon} />
          {showLabels && (
            <span className={`${sizeStyles.text} text-gray-400`}>
              分享
            </span>
          )}
        </button> */}
      </div>
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  )
} 