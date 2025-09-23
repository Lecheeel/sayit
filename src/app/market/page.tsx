'use client'

import { useState, useEffect, Suspense } from 'react'
import { ShoppingBag, Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Toast, { useToast } from '@/components/Toast'

import CreatePostDialog from '@/components/CreatePostDialog'
import FeedList, { FeedItem } from '@/components/FeedList'
import { useAuthContext } from '@/lib/auth-context'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

interface MarketItem {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  category: string
  condition: string
  status: string
  location?: string
  createdAt: string
  seller: User
}

function MarketPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { user, loading: authLoading, isAuthenticated } = useAuthContext()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { toast, showToast, hideToast } = useToast()

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'books', name: '教材书籍' },
    { id: 'electronics', name: '数码电子' },
    { id: 'clothes', name: '服装配饰' },
    { id: 'daily', name: '生活用品' },
    { id: 'sports', name: '运动用品' },
    { id: 'other', name: '其他' }
  ]

  const conditionLabels = {
    NEW: '全新',
    EXCELLENT: '极好',
    GOOD: '良好',
    FAIR: '一般',
    POOR: '较差'
  }

  const statusLabels = {
    AVAILABLE: '可购买',
    SOLD: '已售出',
    RESERVED: '已预订'
  }

  // 检查是否需要自动打开创建对话框
  useEffect(() => {
    const create = searchParams.get('create')
    if (create === 'true' && isAuthenticated) {
      setShowCreateDialog(true)
      // 清除URL参数
      router.replace('/market', { scroll: false })
    }
  }, [searchParams, isAuthenticated, router])

  // 获取商品列表
  useEffect(() => {
    fetchItems()
  }, [selectedCategory])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const url = selectedCategory === 'all' 
        ? '/api/market' 
        : `/api/market?category=${selectedCategory}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('获取商品失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      showToast('请登录后操作', 'error')
      setTimeout(() => {
        router.push('/login?redirect=/market')
      }, 1500)
      return
    }
    setShowCreateDialog(true)
  }

  const handleCreateSuccess = () => {
    fetchItems() // 刷新列表
  }

  // 转换MarketItem为FeedItem格式
  const convertToFeedItems = (marketItems: MarketItem[]): FeedItem[] => {
    return marketItems.map(item => ({
      id: item.id,
      type: 'market' as const,
      title: item.title,
      content: item.description,
      images: item.images,
      author: {
        id: item.seller.id,
        username: item.seller.username,
        nickname: item.seller.nickname,
        avatar: item.seller.avatar
      },
      createdAt: item.createdAt,
      category: item.category,
      price: item.price,
      condition: conditionLabels[item.condition as keyof typeof conditionLabels] || item.condition,
      location: item.location
    }))
  }

  const feedItems = convertToFeedItems(items)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
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
                <ShoppingBag className="mr-2 text-green-500" />
                跳蚤市场
              </h1>
              <p className="text-gray-600 mt-1">买卖闲置，绿色循环</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium flex items-center transition"
            >
              <Plus size={20} className="mr-1" />
              发布商品
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 侧边栏 - 分类 */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">分类</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                      selectedCategory === category.id
                        ? 'bg-green-100 text-green-700 font-medium'
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
            <FeedList
              items={feedItems}
              loading={loading}
              layoutMode="masonry"
              emptyMessage="成为第一个发布商品的人吧！"
              emptyIcon={<ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />}
            />
          </div>
        </div>
      </div>

      {/* 创建商品对话框 */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
        type="market"
      />
    </div>
  )
}

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <MarketPageContent />
    </Suspense>
  )
} 