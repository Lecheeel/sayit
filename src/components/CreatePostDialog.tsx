'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuthContext } from '@/lib/auth-context'
import Toast, { useToast } from '@/components/Toast'
import ImageUpload from '@/components/ImageUpload'

interface CreatePostDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  type: 'confession' | 'post' | 'market' | 'task'
}

interface DialogConfig {
  title: string
  placeholders: {
    title?: string
    content: string
  }
  submitText: string
  api: string
  color: 'pink' | 'blue' | 'green' | 'purple'
  showTitle?: boolean
  showAnonymous?: boolean
  showCategory?: boolean
  showPrice?: boolean
  showReward?: boolean
}

const dialogConfig: Record<string, DialogConfig> = {
  confession: {
    title: '发布表白',
    placeholders: {
      content: '说出你的真心话...(最多1000字)',
    },
    submitText: '发布表白',
    api: '/api/confessions/create',
    color: 'pink',
    showTitle: false,
    showAnonymous: true,
  },
  post: {
    title: '发布帖子',
    placeholders: {
      title: '输入帖子标题...',
      content: '分享你的想法...(最多2000字)',
    },
    submitText: '发布帖子',
    api: '/api/posts/create',
    color: 'blue',
    showTitle: true,
    showAnonymous: false,
    showCategory: true,
  },
  market: {
    title: '发布商品',
    placeholders: {
      title: '商品名称...',
      content: '商品描述...(最多1000字)',
    },
    submitText: '发布商品',
    api: '/api/market/create',
    color: 'green',
    showTitle: true,
    showAnonymous: false,
    showPrice: true,
    showCategory: true,
  },
  task: {
    title: '发布任务',
    placeholders: {
      title: '任务标题...',
      content: '任务描述...(最多1000字)',
    },
    submitText: '发布任务',
    api: '/api/tasks/create',
    color: 'purple',
    showTitle: true,
    showAnonymous: false,
    showReward: true,
    showCategory: true,
  },
}

const categories = {
  post: [
    { id: 'study', name: '学习' },
    { id: 'life', name: '生活' },
    { id: 'entertainment', name: '娱乐' },
    { id: 'sports', name: '运动' },
    { id: 'food', name: '美食' },
    { id: 'other', name: '其他' }
  ],
  market: [
    { id: 'books', name: '教材书籍' },
    { id: 'electronics', name: '数码电子' },
    { id: 'clothes', name: '服装配饰' },
    { id: 'daily', name: '生活用品' },
    { id: 'sports', name: '运动用品' },
    { id: 'other', name: '其他' }
  ],
  task: [
    { id: 'study', name: '学习辅导' },
    { id: 'delivery', name: '代拿快递' },
    { id: 'proxy', name: '代买代办' },
    { id: 'tech', name: '技术帮助' },
    { id: 'other', name: '其他' }
  ]
}

export default function CreatePostDialog({ isOpen, onClose, onSuccess, type }: CreatePostDialogProps) {
  const { isAuthenticated } = useAuthContext()
  const { toast, showToast, hideToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    images: [] as string[],
    isAnonymous: true,
    category: '',
    price: '',
    reward: '',
  })
  const config = dialogConfig[type]

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      showToast('请先登录', 'error')
      return
    }

    // 验证必填字段
    if (config.showTitle && !formData.title.trim()) {
      showToast('请输入标题', 'error')
      return
    }

    if (!formData.content.trim()) {
      showToast('请输入内容', 'error')
      return
    }

    if (config.showPrice && !formData.price) {
      showToast('请输入价格', 'error')
      return
    }

    if (config.showReward && !formData.reward) {
      showToast('请输入悬赏金额', 'error')
      return
    }

    try {
      setLoading(true)

      const submitData: Record<string, any> = {
        content: formData.content,
        images: formData.images,
      }

      if (config.showTitle) {
        submitData.title = formData.title
      }

      if (config.showAnonymous) {
        submitData.isAnonymous = formData.isAnonymous
      }

      if (config.showCategory && formData.category) {
        submitData.category = formData.category
      }

      if (config.showPrice) {
        submitData.price = parseFloat(formData.price)
        submitData.description = formData.content // 市场商品使用description字段
        delete submitData.content
      }

      if (config.showReward) {
        submitData.reward = parseFloat(formData.reward)
        submitData.description = formData.content // 任务使用description字段
        delete submitData.content
      }

      const response = await fetch(config.api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (result.success) {
        showToast('发布成功！', 'success')
        setFormData({
          title: '',
          content: '',
          images: [],
          isAnonymous: true,
          category: '',
          price: '',
          reward: '',
        })
        onSuccess()
        onClose()
      } else {
        showToast(result.message || '发布失败', 'error')
      }
    } catch (error) {
      console.error('发布失败:', error)
      showToast('发布失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }



  // 生成颜色类
  const colorClasses: Record<string, string> = {
    pink: 'bg-pink-500 hover:bg-pink-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{config.title}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 标题输入 */}
            {config.showTitle && (
              <div>
                <input
                  type="text"
                  placeholder={config.placeholders.title}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>
            )}

            {/* 分类选择 */}
            {config.showCategory && (
              <div>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择分类</option>
                  {(categories[type as keyof typeof categories] || []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 价格输入 */}
            {config.showPrice && (
              <div>
                <input
                  type="number"
                  placeholder="商品价格（元）"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {/* 悬赏金额输入 */}
            {config.showReward && (
              <div>
                <input
                  type="number"
                  placeholder="悬赏金额（元）"
                  value={formData.reward}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {/* 内容输入 */}
            <div>
              <textarea
                placeholder={config.placeholders.content}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                maxLength={type === 'confession' ? 1000 : 2000}
              />
              <div className="text-sm text-gray-500 mt-1 text-right">
                {formData.content.length}/{type === 'confession' ? 1000 : 2000}
              </div>
            </div>

            {/* 匿名选项 */}
            {config.showAnonymous && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="anonymous" className="text-sm text-gray-700">
                  匿名发布
                </label>
              </div>
            )}

            {/* 图片上传 */}
            <ImageUpload
              images={formData.images}
              onImagesChange={handleImagesChange}
              maxImages={9}
              maxSizeInMB={5}
              showToast={showToast}
            />

            <DialogFooter>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 ${colorClasses[config.color]} text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    发布中...
                  </>
                ) : (
                  config.submitText
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  )
} 