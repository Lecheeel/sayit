'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DollarSign, Clock, MapPin, ArrowLeft, User, Calendar, Tag } from 'lucide-react'
import DetailImageGallery from '@/components/DetailImageGallery'

interface TaskDetail {
  id: string
  title: string
  description: string
  images?: string[]
  reward: number
  category: string
  deadline?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  publisher: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${params.id}`)
        if (!response.ok) {
          throw new Error('获取任务详情失败')
        }
        const data = await response.json()
        if (data.success) {
          setTask(data.task)
        } else {
          setError(data.error || '获取任务详情失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取任务详情失败')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTask()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '招募中'
      case 'IN_PROGRESS':
        return '进行中'
      case 'COMPLETED':
        return '已完成'
      case 'CANCELLED':
        return '已取消'
      default:
        return '未知状态'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/30 to-amber-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/30 to-amber-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">找不到这个任务</h1>
          <p className="text-gray-600 mb-6">{error || '任务可能已被删除'}</p>
          <button
            onClick={() => router.back()}
            className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/30 to-amber-50/40">

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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {task.category}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{task.title}</h1>

              {/* 作者信息和赏金 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User size={16} />
                    <span>{task.publisher.nickname || task.publisher.username}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={16} />
                    <span>发布于 {formatTime(task.createdAt)}</span>
                  </div>
                  {task.deadline && (
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>截止 {formatTime(task.deadline)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">赏金</div>
                  <div className="text-3xl font-bold text-amber-600 bg-amber-50 px-6 py-3 rounded-xl border border-amber-100">
                    ¥{task.reward}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="py-6">
            {/* 任务图片展示 - 使用统一的图片组件 */}
            <DetailImageGallery 
              images={task.images || []} 
              alt="任务图片"
            />

            {/* 任务描述 - 位于图片下方 */}
            <div className="prose prose-lg max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">任务描述</h2>
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                  {task.description}
                </p>
              </div>
            </div>
          </div>

          {/* 底部操作区 */}
          <div className="py-6 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {task.status === 'OPEN' && (
                  <button className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors font-medium">
                    申请接单
                  </button>
                )}
                <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                  收藏任务
                </button>
              </div>
              <div className="text-sm text-gray-500">
                任务编号：{task.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 