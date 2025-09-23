'use client'

import React from 'react'
import { useInfiniteScrollV2 } from '@/lib/useInfiniteScrollV2'

interface InfiniteScrollContainerProps {
  children: React.ReactNode
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  threshold?: number
  loadingText?: string
  noMoreText?: string
  showHint?: boolean
  accentColor?: string
}

export default function InfiniteScrollContainer({
  children,
  hasMore,
  loading,
  onLoadMore,
  threshold = 300,
  loadingText = '正在加载更多内容...',
  noMoreText = '没有更多内容了',
  showHint = true,
  accentColor = 'indigo'
}: InfiniteScrollContainerProps) {
  const { sentinelRef } = useInfiniteScrollV2({
    hasMore,
    loading,
    onLoadMore,
    threshold
  })

  const getAccentColorClasses = () => {
    const colorMap: Record<string, string> = {
      indigo: 'border-t-indigo-500',
      pink: 'border-t-pink-500',
      blue: 'border-t-blue-500',
      green: 'border-t-green-500',
      yellow: 'border-t-yellow-500',
      red: 'border-t-red-500'
    }
    return colorMap[accentColor] || colorMap.indigo
  }

  return (
    <div>
      {children}
      
      {/* 无限滚动状态提示 */}
      <div ref={sentinelRef} className="text-center py-8">
        {loading ? (
          <div className="flex items-center justify-center space-x-3 text-gray-500">
            <div className={`w-5 h-5 border-2 border-gray-300 ${getAccentColorClasses()} rounded-full animate-spin`}></div>
            <span className="text-sm">{loadingText}</span>
          </div>
        ) : hasMore ? (
          showHint && (
            <div className="text-gray-400 text-sm">
              继续滑动查看更多内容
            </div>
          )
        ) : (
          <div className="text-gray-400 text-sm flex items-center justify-center space-x-2">
            <div className="w-12 h-px bg-gray-200"></div>
            <span>{noMoreText}</span>
            <div className="w-12 h-px bg-gray-200"></div>
          </div>
        )}
      </div>
    </div>
  )
} 