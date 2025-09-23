import { useEffect, useRef, useCallback, useState } from 'react'

interface UseInfiniteScrollV2Options {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  threshold?: number
  debounceDelay?: number
}

export const useInfiniteScrollV2 = ({
  hasMore,
  loading,
  onLoadMore,
  threshold = 300,
  debounceDelay = 100
}: UseInfiniteScrollV2Options) => {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [isLoadingInternal, setIsLoadingInternal] = useState(false)
  const scrollPositionRef = useRef<number>(0)
  const lastItemCountRef = useRef<number>(0)
  const lastLoadTimeRef = useRef<number>(0)
  const isInitialLoad = useRef(true)

  // 防抖处理的加载函数
  const debouncedLoadMore = useCallback(() => {
    if (loading || isLoadingInternal || !hasMore) return

    // 防止快速重复触发
    const now = Date.now()
    if (now - (lastLoadTimeRef.current || 0) < 1000) {
      return // 1秒内不允许重复触发
    }
    
    setIsLoadingInternal(true)
    lastLoadTimeRef.current = now
    
    // 保存当前滚动位置
    scrollPositionRef.current = window.scrollY
    
    // 执行加载
    onLoadMore()
    
    // 设置一个短暂的延迟，确保不会立即再次触发
    setTimeout(() => {
      setIsLoadingInternal(false)
    }, debounceDelay)
  }, [loading, isLoadingInternal, hasMore, onLoadMore, debounceDelay])

  // 监听外部loading状态变化，在加载完成后恢复滚动位置
  useEffect(() => {
    if (!loading && scrollPositionRef.current > 0 && !isInitialLoad.current) {
      // 使用 requestAnimationFrame 确保DOM更新完成
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 计算新增内容的高度差
          const currentScrollHeight = document.documentElement.scrollHeight
          const viewportHeight = window.innerHeight
          const currentPosition = window.scrollY
          
          // 如果当前位置接近之前保存的位置，说明可能发生了跳转
          if (Math.abs(currentPosition - scrollPositionRef.current) > 100) {
            // 平滑恢复到之前的位置
            window.scrollTo({
              top: scrollPositionRef.current,
              behavior: 'auto'
            })
          }
          
          scrollPositionRef.current = 0
        })
      })
    }
    
    if (!loading) {
      isInitialLoad.current = false
    }
  }, [loading])

  // 设置Intersection Observer
  useEffect(() => {
    if (!sentinelRef.current) return

    const currentSentinel = sentinelRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loading && !isLoadingInternal) {
          debouncedLoadMore()
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    )

    observer.observe(currentSentinel)
    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [hasMore, loading, isLoadingInternal, debouncedLoadMore, threshold])

  // 备用的滚动监听（防止Intersection Observer失效）
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let ticking = false

    const handleScroll = () => {
      if (loading || isLoadingInternal || !hasMore || ticking) return

      ticking = true
      
      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement
        
        if (scrollTop + clientHeight >= scrollHeight - threshold) {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            debouncedLoadMore()
          }, debounceDelay)
        }
        
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [loading, isLoadingInternal, hasMore, debouncedLoadMore, threshold, debounceDelay])

  return {
    sentinelRef
  }
} 