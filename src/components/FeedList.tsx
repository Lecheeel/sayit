'use client'

import React from 'react'
import FeedCard from './FeedCard'

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
  stats?: {
    likes: number
    comments: number
  }
  category?: string
  tags?: string[]
  price?: number
  condition?: string
  location?: string
  reward?: number
  deadline?: string
  isAnonymous?: boolean
}

interface FeedListProps {
  items: FeedItem[]
  layoutMode?: 'masonry' | 'waterfall' | 'list' | 'simple'
  showContent?: boolean
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  className?: string
  onItemClick?: (item: FeedItem) => void
}

export default function FeedList({
  items,
  layoutMode = 'masonry',
  showContent = false,
  loading = false,
  emptyMessage = '暂无内容',
  emptyIcon,
  className = '',
  onItemClick
}: FeedListProps) {
  // 加载状态
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // 空状态
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无内容</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  // 如果有自定义className，直接使用，否则使用默认样式
  const containerClass = className || (() => {
    switch (layoutMode) {
      case 'list':
        return 'space-y-4 md:space-y-6'
      case 'simple':
        return 'space-y-3'
      case 'waterfall':
        // 为了减少滚动跳动，优先使用 CSS Grid 而不是 columns
        // CSS Grid 瀑布流布局 - 移动端2列，平板3列，桌面4列
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 auto-rows-min'
      case 'masonry':
      default:
        // CSS Grid 瀑布流布局 - 移动端2列，平板3列，桌面4列
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 auto-rows-min'
    }
  })()

  // CSS Grid 模式不需要特殊包装，columns 模式才需要
  const needsItemWrapper = className && className.includes('columns')

  // 去重并生成安全的key
  const uniqueItems = items.reduce((acc: FeedItem[], item, index) => {
    // 检查是否已存在相同ID的项目
    const existingIndex = acc.findIndex(existing => existing.id === item.id)
    if (existingIndex === -1) {
      acc.push(item)
    }
    return acc
  }, [])

  return (
    <div className={containerClass}>
      {uniqueItems.map((item, index) => {
        // 使用复合key确保唯一性：类型+ID+索引
        const safeKey = `${item.type}-${item.id}-${index}`
        
        return needsItemWrapper ? (
          <div key={safeKey} className="break-inside-avoid mb-6">
            <FeedCard
              item={item}
              layoutMode={layoutMode}
              showContent={showContent}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              isAboveFold={index < 6}
            />
          </div>
        ) : (
          <FeedCard
            key={safeKey}
            item={item}
            layoutMode={layoutMode}
            showContent={showContent}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
            isAboveFold={index < 6}
          />
        )
      })}
    </div>
  )
}

// 导出类型供其他组件使用
export type { FeedItem, FeedListProps } 