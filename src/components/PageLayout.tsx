'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast, { useToast } from './Toast'
import CreatePostDialog from './CreatePostDialog'
import FeedList, { FeedItem } from './FeedList'
import InfiniteScrollContainer from './InfiniteScrollContainer'
import { useAuthContext } from '@/lib/auth-context'

// 分类配置接口
interface CategoryConfig {
  id: string
  name: string
}

// 页面配置接口
interface PageConfig {
  title: string
  subtitle: string
  icon: ReactNode
  buttonText: string
  buttonColor: string
  bgGradient: string
  accentColor?: string
  categories: CategoryConfig[]
  layoutMode?: 'masonry' | 'waterfall' | 'list' | 'simple'
  showContent?: boolean
  useInfiniteScroll?: boolean
  createType: 'post' | 'confession' | 'market' | 'task'
  apiEndpoint: string
  emptyMessage: string
}

// 页面数据钩子接口
interface UsePageDataResult {
  items: any[]
  loading: boolean
  hasMore?: boolean
  page?: number
  fetchData: (currentPage?: number, append?: boolean) => Promise<void>
  loadMore?: () => void
  resetData?: () => void
}

interface PageLayoutProps {
  config: PageConfig
  usePageData: () => UsePageDataResult
  convertToFeedItems: (items: any[]) => FeedItem[]
  className?: string
}

export default function PageLayout({
  config,
  usePageData,
  convertToFeedItems,
  className = ''
}: PageLayoutProps) {
  const router = useRouter()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { isAuthenticated } = useAuthContext()
  const { toast, showToast, hideToast } = useToast()

  // 使用传入的数据钩子
  const { items, loading, hasMore, page, fetchData, loadMore, resetData } = usePageData()

  // 当分类改变时重新获取数据
  useEffect(() => {
    if (resetData) {
      resetData()
    }
    fetchData(1, false)
  }, [selectedCategory])

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      showToast('请登录后操作', 'error')
      setTimeout(() => {
        router.push(`/login?redirect=${window.location.pathname}`)
      }, 1500)
      return
    }
    setShowCreateDialog(true)
  }

  const handleCreateSuccess = () => {
    if (resetData) {
      resetData()
    }
    fetchData(1, false) // 刷新列表
  }

  const feedItems = convertToFeedItems(items)

  // 构建页面类名
  const pageClassName = className || `min-h-screen ${config.bgGradient}`

  return (
    <div className={pageClassName}>
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
                {config.icon}
                {config.title}
              </h1>
              <p className="text-gray-600 mt-1">{config.subtitle}</p>
            </div>
            <button
              onClick={handleCreateClick}
              className={`${config.buttonColor} text-white px-6 py-2 rounded-lg font-medium flex items-center transition`}
            >
              <Plus size={20} className="mr-1" />
              {config.buttonText}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 根据是否为表白墙决定布局结构 */}
        {config.createType === 'confession' ? (
          // 表白墙布局（无侧边栏）
          <div className="max-w-4xl mx-auto px-0">
            {config.useInfiniteScroll ? (
              <InfiniteScrollContainer
                hasMore={hasMore || false}
                loading={loading}
                onLoadMore={loadMore || (() => {})}
                loadingText={`正在加载更多${config.title}...`}
                noMoreText={`暂时没有更多${config.title}了`}
                accentColor={config.accentColor}
              >
                <FeedList
                  items={feedItems}
                  loading={loading}
                  layoutMode={config.layoutMode}
                  showContent={config.showContent}
                  emptyMessage={config.emptyMessage}
                  emptyIcon={config.icon}
                />
              </InfiniteScrollContainer>
            ) : (
              <FeedList
                items={feedItems}
                loading={loading}
                layoutMode={config.layoutMode}
                showContent={config.showContent}
                emptyMessage={config.emptyMessage}
                emptyIcon={config.icon}
              />
            )}
          </div>
        ) : (
          // 其他页面布局（有侧边栏）
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 侧边栏 - 分类 */}
            <div className="lg:w-64">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">分类</h3>
                <div className="space-y-2">
                  {config.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                        selectedCategory === category.id
                          ? `${config.buttonColor.replace('bg-', 'bg-').replace('hover:bg-', '').split(' ')[0]?.replace('bg-', 'bg-')}-100 ${config.buttonColor.replace('bg-', 'text-').replace('hover:bg-', '').split(' ')[0]?.replace('bg-', 'text-')}-700 font-medium`
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 主要内容区域 */}
            <div className="flex-1">
              {config.useInfiniteScroll ? (
                <InfiniteScrollContainer
                  hasMore={hasMore || false}
                  loading={loading}
                  onLoadMore={loadMore || (() => {})}
                  loadingText={`正在加载更多${config.title}...`}
                  noMoreText={`暂时没有更多${config.title}了`}
                  accentColor={config.accentColor}
                >
                  <FeedList
                    items={feedItems}
                    loading={loading}
                    layoutMode={config.layoutMode}
                    showContent={config.showContent}
                    emptyMessage={config.emptyMessage}
                    emptyIcon={config.icon}
                  />
                </InfiniteScrollContainer>
              ) : (
                <FeedList
                  items={feedItems}
                  loading={loading}
                  layoutMode={config.layoutMode}
                  showContent={config.showContent}
                  emptyMessage={config.emptyMessage}
                  emptyIcon={config.icon}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 创建对话框 */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
        type={config.createType}
      />
    </div>
  )
}

// 导出页面配置创建器
export function createPageConfig(overrides: Partial<PageConfig>): PageConfig {
  const defaults: PageConfig = {
    title: '默认页面',
    subtitle: '默认描述',
    icon: <div />,
    buttonText: '发布',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
    bgGradient: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    categories: [{ id: 'all', name: '全部' }],
    layoutMode: 'masonry',
    showContent: true,
    useInfiniteScroll: false,
    createType: 'post',
    apiEndpoint: '/api/posts',
    emptyMessage: '暂无内容'
  }

  return { ...defaults, ...overrides }
}

// 导出类型供其他组件使用
export type { PageConfig, CategoryConfig, UsePageDataResult } 