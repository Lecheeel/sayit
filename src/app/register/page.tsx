'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { useToast } from '@/components/Toast'
import { validateUsername, generateUsernameSuggestions } from '@/lib/auth'

// hCaptcha 组件声明
declare global {
  interface Window {
    hcaptcha: any
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hcaptchaLoaded, setHcaptchaLoaded] = useState(false)
  const [hcaptchaTokenId, setHcaptchaTokenId] = useState<string | null>(null)
  const hcaptchaRef = useRef<any>(null)
  const { toast, showToast, hideToast } = useToast()
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [usernameValidation, setUsernameValidation] = useState<{
    isValid: boolean
    message?: string
    suggestion?: string
  } | null>(null)

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

  // 实时验证用户名
  useEffect(() => {
    if (formData.username.trim()) {
      const validation = validateUsername(formData.username)
      setUsernameValidation(validation)
      
      if (!validation.isValid) {
        const suggestions = generateUsernameSuggestions(formData.username)
        setUsernameSuggestions(suggestions)
        setShowSuggestions(suggestions.length > 0)
      } else {
        setShowSuggestions(false)
        setUsernameSuggestions([])
      }
    } else {
      setUsernameValidation(null)
      setShowSuggestions(false)
    }
  }, [formData.username])

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

  // 选择用户名建议
  const handleSelectSuggestion = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      username: suggestion
    }))
    setShowSuggestions(false)
    setErrors(prev => ({
      ...prev,
      username: ''
    }))
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // 使用新的用户名验证函数
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名'
    } else {
      const validation = validateUsername(formData.username)
      if (!validation.isValid) {
        newErrors.username = validation.message || '用户名格式不正确'
      }
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少6位'
    } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '密码必须包含至少一个字母和一个数字'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    if (!hcaptchaTokenId) {
      newErrors.hcaptcha = '请完成人机验证'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('提交注册，TokenId:', hcaptchaTokenId)
      }
      
      const response = await fetch('/api/auth/register', {
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('注册 API 响应:', result)
      }

      if (result.success) {
        showToast('注册成功！正在跳转到登录页面...', 'success')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        showToast(result.message, 'error')
        // 重置 hCaptcha
        if (window.hcaptcha && hcaptchaRef.current) {
          window.hcaptcha.reset(hcaptchaRef.current)
          setHcaptchaTokenId(null)
        }
      }
    } catch (error) {
      console.error('注册失败:', error)
      showToast('注册失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            用户注册
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            已有账户？{' '}
            <button
              onClick={() => router.push('/login')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              立即登录
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
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-300' : 
                  usernameValidation?.isValid ? 'border-green-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="请输入用户名"
                autoComplete="username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
              {usernameValidation && !usernameValidation.isValid && !errors.username && (
                <div className="mt-1">
                  <p className="text-sm text-red-600">{usernameValidation.message}</p>
                  {usernameValidation.suggestion && (
                    <p className="text-sm text-gray-500 mt-1">{usernameValidation.suggestion}</p>
                  )}
                </div>
              )}
              {usernameValidation?.isValid && (
                <p className="mt-1 text-sm text-green-600">✓ 用户名可用</p>
              )}
              
              {/* 用户名建议 */}
              {showSuggestions && usernameSuggestions.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-800 mb-2">建议的用户名：</p>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
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
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                密码至少6位，包含字母和数字
              </p>
            </div>

            {/* 确认密码 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请再次输入密码"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
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
              disabled={loading || !usernameValidation?.isValid}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
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