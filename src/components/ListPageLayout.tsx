'use client'

import { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast, { useToast } from './Toast'
import FeedList, { FeedItem } from './FeedList'
import InfiniteScrollContainer from './InfiniteScrollContainer'

interface Category {
  id: string
  name: string
}

interface ListPageLayoutProps {
  // 基础配置
  pageTitle: string
  pageDescription: string
  pageIcon: ReactNode
  gradientColors: string
  accentColor: string
  createButtonText: string
  
  // 数据
  items: FeedItem[]
  loading: boolean
  hasMore?: boolean
  
  // 分类相关
  categories?: Category[]
  selectedCategory?: string
  onCategoryChange?: (categoryId: string) => void
  
  // 操作
  onCreateClick: () => void
  onLoadMore?: () => void
  
  // 布局配置
  layoutMode?: 'masonry' | 'waterfall' | 'list' | 'simple'
  showContent?: boolean
  showSidebar?: boolean
  useInfiniteScroll?: boolean
  
  // 空状态
  emptyMessage: string
  emptyIcon: ReactNode
  
  // Toast
  toast: {
    message: string
    type: 'success' | 'error' | 'info'
    isVisible: boolean
  }
  hideToast: () => void
  
  // 自定义内容
  sidebarExtra?: ReactNode
  headerExtra?: ReactNode
  footerExtra?: ReactNode
}

export default function ListPageLayout({
  pageTitle,
  pageDescription,
  pageIcon,
  gradientColors,
  accentColor,
  createButtonText,
  items,
  loading,
  hasMore = false,
  categories,
  selectedCategory = 'all',
  onCategoryChange,
  onCreateClick,
  onLoadMore,
  layoutMode = 'masonry',
  showContent = true,
  showSidebar = true,
  useInfiniteScroll = false,
  emptyMessage,
  emptyIcon,
  toast,
  hideToast,
  sidebarExtra,
  headerExtra,
  footerExtra
}: ListPageLayoutProps) {
  
  const Content = () => (
    <>
      {useInfiniteScroll && onLoadMore ? (
        <InfiniteScrollContainer
          hasMore={hasMore}
          loading={loading}
          onLoadMore={onLoadMore}
          loadingText="正在加载更多内容..."
          noMoreText="暂时没有更多内容了"
          accentColor={accentColor}
        >
          <FeedList
            items={items}
            loading={loading}
            layoutMode={layoutMode}
            showContent={showContent}
            emptyMessage={emptyMessage}
            emptyIcon={emptyIcon}
          />
        </InfiniteScrollContainer>
      ) : (
        <FeedList
          items={items}
          loading={loading}
          layoutMode={layoutMode}
          showContent={showContent}
          emptyMessage={emptyMessage}
          emptyIcon={emptyIcon}
        />
      )}
    </>
  )

  return (
    <div className={`min-h-screen ${gradientColors}`}>
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">{pageIcon}</span>
                {pageTitle}
              </h1>
              <p className="text-gray-600 mt-1">{pageDescription}</p>
            </div>
            <button
              onClick={onCreateClick}
              className={`bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white px-6 py-2 rounded-lg font-medium flex items-center transition`}
            >
              <Plus size={20} className="mr-1" />
              {createButtonText}
            </button>
          </div>
          
          {/* 头部额外内容 */}
          {headerExtra && (
            <div className="mt-4">
              {headerExtra}
            </div>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {showSidebar && (categories || sidebarExtra) ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 侧边栏 */}
            <div className="lg:w-64">
              {/* 分类过滤 */}
              {categories && categories.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">分类</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => onCategoryChange?.(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                          selectedCategory === category.id
                            ? `bg-${accentColor}-100 text-${accentColor}-700 font-medium`
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 侧边栏额外内容 */}
              {sidebarExtra && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  {sidebarExtra}
                </div>
              )}
            </div>

            {/* 主要内容 */}
            <div className="flex-1">
              <Content />
            </div>
          </div>
        ) : (
          /* 无侧边栏布局 */
          <Content />
        )}
      </div>

      {/* 底部额外内容 */}
      {footerExtra && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          {footerExtra}
        </div>
      )}
    </div>
  )
} 