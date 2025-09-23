'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShoppingBag, ArrowLeft, User, Clock, MapPin, Tag, Heart, MessageCircle } from 'lucide-react'
import DetailImageGallery from '@/components/DetailImageGallery'

interface MarketItemDetail {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  category: string
  condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED'
  location?: string
  createdAt: string
  seller: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
}

export default function MarketItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [item, setItem] = useState<MarketItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/market/${params.id}`)
        if (!response.ok) {
          throw new Error('获取商品详情失败')
        }
        const data = await response.json()
        if (data.success) {
          setItem(data.item)
        } else {
          setError(data.error || '获取商品详情失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取商品详情失败')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchItem()
    }
  }, [params.id])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'NEW':
        return '全新'
      case 'EXCELLENT':
        return '近新'
      case 'GOOD':
        return '良好'
      case 'FAIR':
        return '一般'
      case 'POOR':
        return '较差'
      default:
        return '未知'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'NEW':
        return 'bg-green-100 text-green-800'
      case 'EXCELLENT':
        return 'bg-blue-100 text-blue-800'
      case 'GOOD':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAIR':
        return 'bg-orange-100 text-orange-800'
      case 'POOR':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800'
      case 'SOLD':
        return 'bg-gray-100 text-gray-800'
      case 'RESERVED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return '在售'
      case 'SOLD':
        return '已售出'
      case 'RESERVED':
        return '已预订'
      default:
        return '未知状态'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">找不到这件商品</h1>
          <p className="text-gray-600 mb-6">{error || '商品可能已被删除'}</p>
          <button
            onClick={() => router.back()}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/40">

      {/* 主要内容 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full">
          {/* 头部信息 - 标题在最上方 */}
          <div className="pb-6 border-b border-gray-200">
            <div className="mb-4">
              {/* 返回按钮 */}
              <button
                onClick={() => router.back()}
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span>返回</span>
              </button>

              {/* 标题部分 */}
              <div className="flex items-center space-x-3 mb-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  跳蚤市场
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{item.title}</h1>

              {/* 价格、作者信息和统计 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User size={16} />
                    <span>{item.seller.nickname || item.seller.username}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={16} />
                    <span>发布于 {formatTime(item.createdAt)}</span>
                  </div>
                  {item.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin size={16} />
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">售价</div>
                  <div className="text-3xl font-bold text-green-600 bg-green-50 px-6 py-3 rounded-xl border border-green-100">
                    ¥{item.price}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 图片区域 - 使用统一的图片组件 */}
          <div className="py-6 border-b border-gray-200">
            <DetailImageGallery 
              images={item.images || []} 
              alt="商品图片"
            />
          </div>

          {/* 商品描述 - 位于下方 */}
          <div className="py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">商品描述</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                {item.description}
              </p>
            </div>
          </div>

          {/* 操作按钮区域 */}
          <div className="py-6 bg-gray-50/50">
            <div className="max-w-md mx-auto space-y-4">
              {item.status === 'AVAILABLE' && (
                <>
                  <button className="w-full bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition-colors font-medium text-lg">
                    立即购买
                  </button>
                  <button className="w-full border border-green-500 text-green-500 py-4 rounded-lg hover:bg-green-50 transition-colors font-medium">
                    联系卖家
                  </button>
                </>
              )}
              <div className="flex space-x-4">
                <button className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 bg-white">
                  <Heart size={18} />
                  <span>收藏</span>
                </button>
                <button className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 bg-white">
                  <MessageCircle size={18} />
                  <span>咨询</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
} 