'use client'

import Link from 'next/link'
import { LogOut, Home, Menu, X, ChevronDown, ChevronUp, Search, Settings } from 'lucide-react'
import { useAuthContext } from '@/lib/auth-context'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'


export default function Navbar() {
  const { user, logout } = useAuthContext()
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(true) // 默认展开
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 监听滚动事件，智能显示/隐藏导航栏
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < 100) {
        // 在页面顶部时总是展开
        setIsExpanded(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 200) {
        // 向下滚动时收起（除非用户手动控制）
        setIsExpanded(false)
      } else if (currentScrollY < lastScrollY) {
        // 向上滚动时展开
        setIsExpanded(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const toggleNavbar = () => {
    setIsExpanded(!isExpanded)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // 搜索处理函数
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // 对搜索词进行 URL 编码
      const encodedQuery = encodeURIComponent(searchQuery.trim())
      router.push(`/search?q=${encodedQuery}`)
      setSearchQuery('')
      setIsSearchFocused(false)
      setIsMobileMenuOpen(false)
    }
  }

  // 搜索输入处理（包含防抖）
  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
  }

  // 快捷键支持（Ctrl+K 或 Cmd+K）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* 折叠控制按钮 - 当导航栏收起时显示 */}
      {!isExpanded && (
        <button
          onClick={toggleNavbar}
          className="fixed top-2 right-4 z-60 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200"
          aria-label="展开导航栏"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* 主导航栏 */}
      <nav className={`bg-white shadow-sm border-b sticky top-0 z-50 transition-transform duration-300 ${
        isExpanded ? 'transform translate-y-0' : 'transform -translate-y-full'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo 和移动端快捷按钮 */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">sayit</span>
              </Link>
              
              {/* 移动端快捷功能 */}
              <div className="flex items-center space-x-2 lg:hidden">
                {/* 首页按钮 */}
                <Link 
                  href="/" 
                  className="p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  title="首页"
                >
                  <Home size={20} />
                </Link>
                
                {/* 搜索按钮 */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(true)
                    // 延迟聚焦搜索框
                    setTimeout(() => {
                      const searchInput = document.querySelector('#mobile-search-input') as HTMLInputElement
                      if (searchInput) {
                        searchInput.focus()
                      }
                    }, 100)
                  }}
                  className="p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  title="搜索"
                >
                  <Search size={20} />
                </button>
              </div>
            </div>

            {/* 桌面端导航链接 - 优化间距 */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition flex items-center">
                <Home size={16} className="mr-1" />
                首页
              </Link>
              <Link href="/confessions" className="text-gray-600 hover:text-pink-500 transition">
                表白墙
              </Link>
              <Link href="/posts" className="text-gray-600 hover:text-blue-500 transition">
                校园圈
              </Link>
              <Link href="/market" className="text-gray-600 hover:text-green-500 transition">
                跳蚤市场
              </Link>
              <Link href="/tasks" className="text-gray-600 hover:text-yellow-500 transition">
                悬赏任务
              </Link>
            </div>

            {/* 搜索框 - 优化长度 */}
            <div className="flex-1 max-w-sm mx-6 hidden md:block">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <Search 
                    size={20} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="搜索内容... (Ctrl+K)"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                      isSearchFocused ? 'bg-white shadow-sm' : ''
                    }`}
                    maxLength={100}
                  />
                </div>
              </form>
            </div>

            {/* 右侧控制区域 - 优化布局 */}
            <div className="flex items-center space-x-3">
              
              {/* 用户信息和退出按钮 */}
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700 hidden sm:block max-w-[120px] truncate">
                    欢迎, <span className="font-medium" title={user.nickname || user.username}>
                      {user.nickname || user.username}
                    </span>
                  </span>
                  {/* 管理员后台链接 */}
                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-purple-50"
                      title="管理后台"
                    >
                      <Settings size={16} />
                      <span className="hidden lg:inline">管理</span>
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">退出</span>
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition">
                    登录
                  </Link>
                  <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition">
                    注册
                  </Link>
                </div>
              )}

              {/* 移动端菜单按钮 */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                aria-label="打开菜单"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* 折叠控制按钮 */}
              <button
                onClick={toggleNavbar}
                className="hidden sm:flex p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                aria-label={isExpanded ? '收起导航栏' : '展开导航栏'}
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-3">
              
              {/* 移动端搜索框 */}
              <div className="md:hidden mb-4">
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative">
                    <Search 
                      size={18} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="mobile-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      placeholder="搜索内容..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
                      maxLength={100}
                    />
                  </div>
                </form>
              </div>

              {/* 移动端导航链接 */}
              <div className="space-y-2">
                <Link 
                  href="/" 
                  className="block text-indigo-600 hover:text-indigo-700 py-3 px-3 bg-indigo-50 rounded-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Home size={18} className="mr-3" />
                    <span className="text-base">首页</span>
                  </div>
                </Link>
                <Link 
                  href="/confessions" 
                  className="block text-gray-600 hover:text-pink-500 py-3 px-3 rounded-lg hover:bg-pink-50 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-base">表白墙</span>
                </Link>
                <Link 
                  href="/posts" 
                  className="block text-gray-600 hover:text-blue-500 py-3 px-3 rounded-lg hover:bg-blue-50 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-base">校园圈</span>
                </Link>
                <Link 
                  href="/market" 
                  className="block text-gray-600 hover:text-green-500 py-3 px-3 rounded-lg hover:bg-green-50 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-base">跳蚤市场</span>
                </Link>
                <Link 
                  href="/tasks" 
                  className="block text-gray-600 hover:text-yellow-500 py-3 px-3 rounded-lg hover:bg-yellow-50 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-base">悬赏任务</span>
                </Link>
                
                {/* 管理员后台链接 - 移动端 */}
                {user && user.role === 'ADMIN' && (
                  <Link 
                    href="/admin" 
                    className="block text-purple-600 hover:text-purple-700 py-3 px-3 rounded-lg hover:bg-purple-50 transition-all"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Settings size={18} className="mr-3" />
                      <span className="text-base">管理后台</span>
                    </div>
                  </Link>
                )}
              </div>

              {/* 移动端用户菜单 */}
              {!user && (
                <div className="pt-3 space-y-2">
                  <Link 
                    href="/login" 
                    className="block w-full text-center bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    登录
                  </Link>
                  <Link 
                    href="/register" 
                    className="block w-full text-center bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
} 