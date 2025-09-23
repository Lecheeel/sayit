'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useAuthContext } from '@/lib/auth-context'
import Toast, { useToast } from './Toast'

interface LikeButtonProps {
  targetId: string
  targetType: 'confession' | 'post' | 'market' | 'task' | 'comment'
  initialLikeCount?: number
  initialIsLiked?: boolean
  onLikeChange?: (liked: boolean, newCount: number) => void
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export default function LikeButton({
  targetId,
  targetType,
  initialLikeCount = 0,
  initialIsLiked = false,
  onLikeChange,
  size = 'md',
  showCount = true
}: LikeButtonProps) {
  const { isAuthenticated } = useAuthContext()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [loading, setLoading] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  // 获取点赞状态
  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(`/api/likes?targetId=${targetId}&targetType=${targetType}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setIsLiked(data.isLiked)
            setLikeCount(data.likeCount)
          }
        }
      } catch (error) {
        console.error('获取点赞状态失败:', error)
      }
    }

    fetchLikeStatus()
  }, [targetId, targetType])

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
          const newCount = newIsLiked ? likeCount + 1 : likeCount - 1
          
          setIsLiked(newIsLiked)
          setLikeCount(newCount)
          
          onLikeChange?.(newIsLiked, newCount)
        }
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      showToast('点赞操作失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'p-1.5',
          icon: 14,
          text: 'text-xs'
        }
      case 'lg':
        return {
          button: 'p-3',
          icon: 24,
          text: 'text-lg'
        }
      default:
        return {
          button: 'p-2',
          icon: 18,
          text: 'text-sm'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  return (
    <>
      <button
        onClick={handleLike}
        disabled={loading}
        className={`
          flex items-center space-x-2 rounded-full transition-all duration-200
          ${isLiked 
            ? 'text-pink-500 bg-pink-50 hover:bg-pink-100' 
            : 'text-gray-500 hover:text-pink-500 hover:bg-pink-50'
          }
          ${sizeClasses.button}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        `}
        title={isLiked ? '取消点赞' : '点赞'}
      >
        <Heart 
          size={sizeClasses.icon} 
          className={`transition-all duration-200 ${
            isLiked ? 'fill-current' : ''
          }`}
        />
        {showCount && (
          <span className={`font-medium ${sizeClasses.text}`}>
            {likeCount}
          </span>
        )}
      </button>
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  )
} 