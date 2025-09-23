'use client'

import { useEffect, useRef } from 'react'

interface UseViewTrackerEnhancedOptions {
  targetId: string
  targetType: 'post' | 'confession' | 'market' | 'task'
  enabled?: boolean
  threshold?: number // 可见度阈值
  delay?: number // 延迟记录时间（毫秒）
}

/**
 * 增强版浏览量追踪Hook
 * 支持所有内容类型的浏览量追踪
 * 使用Intersection Observer API来检测元素可见性
 * 当元素可见超过指定时间后记录浏览量
 */
export function useViewTrackerEnhanced({
  targetId,
  targetType,
  enabled = true,
  threshold = 0.3,
  delay = 5000 
}: UseViewTrackerEnhancedOptions) {
  const elementRef = useRef<HTMLDivElement>(null)
  const hasTracked = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentTargetRef = useRef<string>('')
  const isCountingDown = useRef(false) // 新增：是否正在倒计时

  useEffect(() => {
    // 当targetId或targetType改变时，重置追踪状态
    if (currentTargetRef.current !== `${targetId}-${targetType}`) {
      console.log(`[ViewTracker] 目标改变: ${currentTargetRef.current} -> ${targetId}-${targetType}`)
      hasTracked.current = false
      isCountingDown.current = false
      currentTargetRef.current = `${targetId}-${targetType}`
    }
  }, [targetId, targetType])

  useEffect(() => {
    console.log(`[ViewTracker] useEffect触发: targetId=${targetId}, targetType=${targetType}, enabled=${enabled}, hasTracked=${hasTracked.current}`)
    
    if (!enabled || !targetId || !targetType || hasTracked.current) {
      console.log(`[ViewTracker] 跳过追踪: enabled=${enabled}, targetId=${!!targetId}, targetType=${!!targetType}, hasTracked=${hasTracked.current}`)
      return
    }

    const element = elementRef.current
    if (!element) {
      console.log(`[ViewTracker] 元素未找到，跳过追踪`)
      return
    }

    console.log(`[ViewTracker] 开始设置观察器: ${targetId}`)

    // 创建Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        console.log(`[ViewTracker] 可见性变化: intersecting=${entry.isIntersecting}, ratio=${entry.intersectionRatio}, isCountingDown=${isCountingDown.current}`)
        
        if (entry.isIntersecting && entry.intersectionRatio >= threshold && !isCountingDown.current) {
          console.log(`[ViewTracker] 元素可见，开始延迟计时: ${delay}ms`)
          isCountingDown.current = true // 标记开始倒计时
          // 元素可见度达到阈值，开始延迟计时
          timeoutRef.current = setTimeout(async () => {
            if (!hasTracked.current) {
              console.log(`[ViewTracker] 开始记录浏览量: ${targetType}-${targetId}`)
              try {
                // 根据内容类型构建请求体
                let requestBody: any = {}
                
                switch (targetType) {
                  case 'post':
                    requestBody = { postId: targetId }
                    break
                  case 'confession':
                    requestBody = { confessionId: targetId }
                    break
                  case 'market':
                    requestBody = { marketItemId: targetId }
                    break
                  case 'task':
                    requestBody = { taskId: targetId }
                    break
                  default:
                    console.warn('不支持的内容类型:', targetType)
                    return
                }

                console.log(`[ViewTracker] 发送请求:`, requestBody)

                const response = await fetch('/api/views', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(requestBody)
                })

                if (response.ok) {
                  const data = await response.json()
                  console.log(`[ViewTracker] 服务器响应:`, data)
                  if (data.success && data.viewIncremented) {
                    hasTracked.current = true
                    console.log(`[ViewTracker] 浏览量已记录: ${targetType}-${targetId}`)
                  }
                } else {
                  console.error(`[ViewTracker] 请求失败:`, response.status, response.statusText)
                }
              } catch (error) {
                console.error('[ViewTracker] 记录浏览量失败:', error)
              }
            } else {
              console.log(`[ViewTracker] 已记录过，跳过`)
            }
            isCountingDown.current = false // 倒计时结束
          }, delay)
        } else if (!entry.isIntersecting && !isCountingDown.current) {
          // 只有在没有开始倒计时时才清除计时器
          if (timeoutRef.current) {
            console.log(`[ViewTracker] 元素不可见且未开始倒计时，清除计时器`)
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        } else if (!entry.isIntersecting && isCountingDown.current) {
          console.log(`[ViewTracker] 元素不可见但已开始倒计时，继续执行`)
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
      console.log(`[ViewTracker] 清理观察器: ${targetId}`)
      observer.disconnect()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      isCountingDown.current = false
    }
  }, [targetId, targetType, enabled, threshold, delay])

  return elementRef
} 