'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { useToast } from '@/components/Toast'
import { useAuthContext } from '@/lib/auth-context'

// hCaptcha 组件声明
declare global {
  interface Window {
    hcaptcha: any
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hcaptchaLoaded, setHcaptchaLoaded] = useState(false)
  const [hcaptchaTokenId, setHcaptchaTokenId] = useState<string | null>(null)
  const hcaptchaRef = useRef<any>(null)
  const { toast, showToast, hideToast } = useToast()
  const { updateUser } = useAuthContext()
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 加载 hCaptcha 脚本
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = true
    script.onload = () => setHcaptchaLoaded(true)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // hCaptcha 验证成功回调
  const onHCaptchaVerify = async (token: string) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('hCaptcha token received:', token)
      }
      
      const response = await fetch('/api/hcaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()
      
      if (result.success) {
        setHcaptchaTokenId(result.data.tokenId)
        if (process.env.NODE_ENV === 'development') {
          console.log('hCaptcha 验证成功，TokenId:', result.data.tokenId)
        }
        showToast('人机验证通过！', 'success')
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('hCaptcha verification failed:', result)
        }
        showToast(result.message || 'hCaptcha 验证失败', 'error')
        // 重置 hCaptcha
        if (window.hcaptcha && hcaptchaRef.current) {
          window.hcaptcha.reset(hcaptchaRef.current)
        }
      }
    } catch (error) {
      console.error('hCaptcha 验证失败:', error)
      showToast('hCaptcha 验证失败，请重试', 'error')
    }
  }

  // hCaptcha 过期回调
  const onHCaptchaExpire = () => {
    setHcaptchaTokenId(null)
    showToast('hCaptcha 已过期，请重新验证', 'warning')
  }

  // hCaptcha 错误回调
  const onHCaptchaError = (err: string) => {
    console.error('hCaptcha 错误:', err)
    setHcaptchaTokenId(null)
    showToast('hCaptcha 验证出错，请重试', 'error')
  }

  // 渲染 hCaptcha
  useEffect(() => {
    if (hcaptchaLoaded && window.hcaptcha) {
      hcaptchaRef.current = window.hcaptcha.render('hcaptcha-container', {
        sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001',
        callback: onHCaptchaVerify,
        'expired-callback': onHCaptchaExpire,
        'error-callback': onHCaptchaError,
        theme: 'light',
        size: 'normal'
      })
    }
  }, [hcaptchaLoaded])

  // 处理表单输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除对应的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名'
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    }

    if (!hcaptchaTokenId) {
      newErrors.hcaptcha = '请完成人机验证'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('提交登录，TokenId:', hcaptchaTokenId)
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          hcaptchaTokenId: hcaptchaTokenId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        showToast('登录成功！', 'success')
        // 使用 useAuth hook 更新用户状态
        updateUser(result.data.user)
        setTimeout(() => {
          router.push('/') // 跳转到首页
        }, 1500) // 显示成功消息后再跳转
      } else {
        showToast(result.message, 'error')
        // 重置 hCaptcha
        if (window.hcaptcha && hcaptchaRef.current) {
          window.hcaptcha.reset(hcaptchaRef.current)
          setHcaptchaTokenId(null)
        }
      }
    } catch (error) {
      console.error('登录失败:', error)
      showToast('登录失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            用户登录
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            还没有账户？{' '}
            <button
              onClick={() => router.push('/register')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              立即注册
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入用户名"
                autoComplete="username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* hCaptcha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                人机验证
              </label>
              <div id="hcaptcha-container"></div>
              {errors.hcaptcha && (
                <p className="mt-1 text-sm text-red-600">{errors.hcaptcha}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Toast 组件 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  )
} 