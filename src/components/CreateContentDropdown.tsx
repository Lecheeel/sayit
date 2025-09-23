'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Heart, MessageCircle, ShoppingBag, DollarSign, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateOption {
  type: string
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  hoverColor: string
  href: string
}

const createOptions: CreateOption[] = [
  {
    type: 'confession',
    label: '表白墙',
    description: '匿名表白，传递心声',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    hoverColor: 'hover:bg-pink-100',
    href: '/confessions'
  },
  {
    type: 'post',
    label: '校园圈',
    description: '分享校园生活点滴',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100',
    href: '/posts'
  },
  {
    type: 'market',
    label: '跳蚤市场',
    description: '发布二手商品',
    icon: ShoppingBag,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100',
    href: '/market'
  },
  {
    type: 'task',
    label: '悬赏任务',
    description: '发布悬赏求助',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    hoverColor: 'hover:bg-amber-100',
    href: '/tasks'
  }
]

export default function CreateContentDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 检查登录状态
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('解析用户数据失败:', error)
      }
    }
  }, [])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOptionClick = (option: CreateOption) => {
    setIsOpen(false)
    if (!user) {
      // 未登录用户，引导到登录页面
      router.push(`/login?redirect=${encodeURIComponent(option.href + '?create=true')}`)
      return
    }
    // 跳转到对应的创建页面，添加create参数表示是创建模式
    router.push(`${option.href}?create=true`)
  }

  const handleLoginClick = () => {
    setIsOpen(false)
    router.push('/login')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 主按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm border border-indigo-600"
        title="发布内容"
      >
        <Plus size={16} />
        <span>发布</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2">
          {/* 标题 */}
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">
              {user ? '选择发布类型' : '登录后发布'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {user ? '选择你想要发布的内容类型' : '登录后即可发布各种类型的内容'}
            </p>
          </div>

          {/* 选项列表 */}
          <div className="py-2">
            {!user ? (
              // 未登录时显示登录选项
              <button
                onClick={handleLoginClick}
                className="w-full px-4 py-3 flex items-start space-x-3 hover:bg-indigo-50 transition-colors duration-200 text-left"
              >
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <LogIn size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    立即登录
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    登录后即可发布表白、帖子、商品等内容
                  </div>
                </div>
              </button>
            ) : (
              // 已登录时显示发布选项
              createOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.type}
                    onClick={() => handleOptionClick(option)}
                    className={`w-full px-4 py-3 flex items-start space-x-3 ${option.hoverColor} transition-colors duration-200 text-left`}
                  >
                    <div className={`w-8 h-8 ${option.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={16} className={option.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
} 