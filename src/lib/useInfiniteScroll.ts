import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  threshold?: number // 距离底部多少像素时触发加载
  rootMargin?: string // Intersection Observer 的 rootMargin
  maintainScrollPosition?: boolean // 是否保持滚动位置
}

export const useInfiniteScroll = ({
  hasMore,
  loading,
  onLoadMore,
  threshold = 200,
  rootMargin = '0px',
  maintainScrollPosition = true
}: UseInfiniteScrollOptions) => {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const lastScrollHeight = useRef<number>(0)
  const isLoadingRef = useRef<boolean>(false)

  // 使用 useCallback 避免 useEffect 的依赖问题
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !isLoadingRef.current) {
      isLoadingRef.current = true
      
      // 保存当前滚动高度
      if (maintainScrollPosition) {
        lastScrollHeight.current = document.documentElement.scrollHeight
      }
      
      onLoadMore()
    }
  }, [loading, hasMore, onLoadMore, maintainScrollPosition])

  // 监听加载状态变化，恢复滚动位置
  useEffect(() => {
    isLoadingRef.current = loading
    
    if (!loading && maintainScrollPosition && lastScrollHeight.current > 0) {
      // 使用 requestAnimationFrame 确保 DOM 更新完成后再恢复滚动位置
      requestAnimationFrame(() => {
        const newScrollHeight = document.documentElement.scrollHeight
        const heightDifference = newScrollHeight - lastScrollHeight.current
        
        if (heightDifference > 0) {
          // 保持用户当前的相对位置
          const currentScrollTop = window.scrollY
          const newScrollTop = currentScrollTop + heightDifference
          
          // 平滑恢复到新位置，但不要过于明显
          window.scrollTo({
            top: newScrollTop,
            behavior: 'auto' // 使用 auto 而不是 smooth，避免明显的滚动
          })
        }
        
        lastScrollHeight.current = 0
      })
    }
  }, [loading, maintainScrollPosition])

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current
    if (!loadMoreElement) return

    // 清理旧的 observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // 创建新的 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          handleLoadMore()
        }
      },
      {
        rootMargin,
        threshold: 0.1
      }
    )

    observerRef.current.observe(loadMoreElement)

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleLoadMore, rootMargin])

  // 额外的滚动监听作为备用方案
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      // 节流处理，避免频繁触发
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement
        
        // 当滚动到距离底部指定像素时触发加载
        if (scrollTop + clientHeight >= scrollHeight - threshold) {
          handleLoadMore()
        }
      }, 100) // 100ms 节流
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [handleLoadMore, threshold])

  return {
    loadMoreRef
  }
} 