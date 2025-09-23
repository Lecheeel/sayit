'use client'

import { useAuth } from '@/lib/useAuth'
import { useState, useEffect } from 'react'
import Toast from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ContentItem {
  id: string
  type: 'confession' | 'post' | 'market' | 'task'
  title?: string
  content: string
  author: {
    id: string
    username: string
    nickname?: string
  }
  createdAt: string
  viewCount: number
  likesCount: number
  commentsCount: number
}

interface AdminStats {
  totalUsers: number
  totalConfessions: number
  totalPosts: number
  totalMarketItems: number
  totalTasks: number
  totalComments: number
  totalLikes: number
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [contents, setContents] = useState<ContentItem[]>([])
  const [selectedTab, setSelectedTab] = useState<'stats' | 'contents'>('stats')
  const [selectedContentType, setSelectedContentType] = useState<'all' | 'confession' | 'post' | 'market' | 'task'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; item: ContentItem | null }>({ isOpen: false, item: null })

  // 权限检查
  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      window.location.href = '/'
    }
  }, [user, loading])

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  // 获取内容列表
  const fetchContents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/contents?type=${selectedContentType}`)
      if (response.ok) {
        const data = await response.json()
        setContents(data)
      }
    } catch (error) {
      console.error('获取内容列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 删除内容
  const deleteContent = async (item: ContentItem) => {
    try {
      const response = await fetch(`/api/admin/contents/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: item.type })
      })

      if (response.ok) {
        setToast({ message: '内容删除成功', type: 'success' })
        fetchContents() // 重新获取列表
        if (selectedTab === 'stats') {
          fetchStats() // 重新获取统计数据
        }
      } else {
        const error = await response.json()
        setToast({ message: error.message || '删除失败', type: 'error' })
      }
    } catch (error) {
      setToast({ message: '删除失败', type: 'error' })
    }
  }

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats()
    }
  }, [user])

  useEffect(() => {
    if (selectedTab === 'contents') {
      fetchContents()
    }
  }, [selectedTab, selectedContentType])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">权限不足</div>
      </div>
    )
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'confession': return '表白'
      case 'post': return '帖子'
      case 'market': return '市场'
      case 'task': return '任务'
      default: return type
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
            <p className="mt-2 text-gray-600">欢迎，{user.nickname || user.username}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页导航 */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab('stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                数据统计
              </button>
              <button
                onClick={() => setSelectedTab('contents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'contents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                内容管理
              </button>
            </nav>
          </div>
        </div>

        {/* 数据统计 */}
        {selectedTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats && (
              <>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">总用户数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">表白总数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalConfessions}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">帖子总数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">市场物品总数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMarketItems}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">任务总数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">评论总数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalComments}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">点赞总数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalLikes}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* 内容管理 */}
        {selectedTab === 'contents' && (
          <div>
            {/* 筛选器 */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <div className="flex flex-wrap gap-2">
                {['all', 'confession', 'post', 'market', 'task'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedContentType(type as any)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedContentType === type
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? '全部' : getContentTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容列表 */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : contents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">暂无内容</div>
                </div>
              ) : (
                contents.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getContentTypeLabel(item.type)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {item.title && (
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{item.title}</h3>
                        )}
                        <p className="text-gray-700 mb-3 line-clamp-3">{item.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>作者: {item.author.nickname || item.author.username}</span>
                          <span>浏览: {item.viewCount}</span>
                          <span>点赞: {item.likesCount}</span>
                          <span>评论: {item.commentsCount}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, item })}
                        className="ml-4 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, item: null })}
        onConfirm={() => {
          if (deleteDialog.item) {
            deleteContent(deleteDialog.item)
            setDeleteDialog({ isOpen: false, item: null })
          }
        }}
        title="确认删除"
        description={`确定要删除这个${deleteDialog.item ? getContentTypeLabel(deleteDialog.item.type) : '内容'}吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="error"
      />

      {/* Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
} 