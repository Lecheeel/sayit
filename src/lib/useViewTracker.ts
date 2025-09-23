'use client'

import { useEffect, useRef } from 'react'

interface UseViewTrackerOptions {
  postId: string
  enabled?: boolean
  threshold?: number // 可见度阈值
  delay?: number // 延迟记录时间（毫秒）
}

/**
 * 浏览量追踪Hook
 * 使用Intersection Observer API来检测元素可见性
 * 当元素可见超过指定时间后记录浏览量
 */
export function useViewTracker({
  postId,
  enabled = true,
  threshold = 0.3, // 30%可见度（降低阈值）
  delay = 500 // 500ms延迟（缩短延迟）
}: UseViewTrackerOptions) {
  const elementRef = useRef<HTMLDivElement>(null)
  const hasTracked = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentPostIdRef = useRef<string>('')
  const isCountingDown = useRef(false) // 新增：是否正在倒计时

  useEffect(() => {
    // 当postId改变时，重置追踪状态
    if (currentPostIdRef.current !== postId) {
      hasTracked.current = false
      isCountingDown.current = false
      currentPostIdRef.current = postId
    }
  }, [postId])

  useEffect(() => {
    if (!enabled || !postId || hasTracked.current) {
      return
    }

    const element = elementRef.current
    if (!element) {
      return
    }

    // 创建Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        
        if (entry.isIntersecting && entry.intersectionRatio >= threshold && !isCountingDown.current) {
          isCountingDown.current = true // 标记开始倒计时
          // 元素可见度达到阈值，开始延迟计时
          timeoutRef.current = setTimeout(async () => {
            if (!hasTracked.current) {
              try {
                const response = await fetch('/api/views', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ postId })
                })

                if (response.ok) {
                  const data = await response.json()
                  if (data.success && data.viewIncremented) {
                    hasTracked.current = true
                    console.log('浏览量已记录:', postId)
                  }
                }
              } catch (error) {
                console.error('记录浏览量失败:', error)
              }
            }
            isCountingDown.current = false // 倒计时结束
          }, delay)
        } else if (!entry.isIntersecting && !isCountingDown.current) {
          // 只有在没有开始倒计时时才清除计时器
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        }
      },
      {
        threshold,
        rootMargin: '0px'
      }
    )

    observer.observe(element)

    // 清理函数
    return () => {
      observer.disconnect()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      isCountingDown.current = false
    }
  }, [postId, enabled, threshold, delay])

  return elementRef
} 