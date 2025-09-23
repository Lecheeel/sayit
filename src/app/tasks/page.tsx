'use client'

import { useState, useEffect, Suspense } from 'react'
import { Target, Plus } from 'lucide-react'
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

interface Task {
  id: string
  title: string
  description: string
  images?: string[]
  reward: number
  category: string
  deadline?: string
  status: string
  createdAt: string
  publisher: User
  acceptor?: User
  _count?: {
    applications: number
  }
}

function TasksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { user, loading: authLoading, isAuthenticated } = useAuthContext()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { toast, showToast, hideToast } = useToast()

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'study', name: '学习辅导' },
    { id: 'delivery', name: '代拿快递' },
    { id: 'proxy', name: '代买代办' },
    { id: 'tech', name: '技术帮助' },
    { id: 'other', name: '其他' }
  ]

  // 检查是否需要自动打开创建对话框
  useEffect(() => {
    const create = searchParams.get('create')
    if (create === 'true' && isAuthenticated) {
      setShowCreateDialog(true)
      // 清除URL参数
      router.replace('/tasks', { scroll: false })
    }
  }, [searchParams, isAuthenticated, router])

  // 获取任务列表
  useEffect(() => {
    fetchTasks()
  }, [selectedCategory])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const url = selectedCategory === 'all' 
        ? '/api/tasks' 
        : `/api/tasks?category=${selectedCategory}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('获取任务失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      showToast('请登录后操作', 'error')
      setTimeout(() => {
        router.push('/login?redirect=/tasks')
      }, 1500)
      return
    }
    setShowCreateDialog(true)
  }

  const handleCreateSuccess = () => {
    fetchTasks() // 刷新列表
  }

  // 转换Task为FeedItem格式
  const convertToFeedItems = (tasks: Task[]): FeedItem[] => {
    return tasks.map(task => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      content: task.description,
      images: task.images || [],
      author: {
        id: task.publisher.id,
        username: task.publisher.username,
        nickname: task.publisher.nickname,
        avatar: task.publisher.avatar
      },
      createdAt: task.createdAt,
      category: task.category,
      reward: task.reward,
      deadline: task.deadline
    }))
  }

  const feedItems = convertToFeedItems(tasks)

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
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
                <Target className="mr-2 text-yellow-500" />
                悬赏任务
              </h1>
              <p className="text-gray-600 mt-1">发布任务，寻求帮助</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-medium flex items-center transition"
            >
              <Plus size={20} className="mr-1" />
              发布任务
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
                        ? 'bg-yellow-100 text-yellow-700 font-medium'
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
              showContent={false}
              emptyMessage="成为第一个发布任务的人吧！"
              emptyIcon={<Target className="mx-auto h-12 w-12 text-gray-400" />}
            />
          </div>
        </div>
      </div>

      {/* 创建任务对话框 */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
        type="task"
      />
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <TasksPageContent />
    </Suspense>
  )
} 