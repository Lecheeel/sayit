'use client'

import React, { useState, useEffect } from 'react'
import { Monitor, Activity, CheckCircle, XCircle } from 'lucide-react'
import { authManager } from '@/lib/auth-client'

interface AuthPerformanceStats {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  cacheHitRate: number
  lastRequestTime: number | null
}

interface AuthDebugInfo {
  tokenStatus: 'valid' | 'expired' | 'missing' | 'unknown'
  deviceFingerprint: string
  lastRefresh: string | null
  authErrors: string[]
  refreshCount: number
}

// 全局性能统计
let performanceStats: AuthPerformanceStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  cacheHitRate: 0,
  lastRequestTime: null
}

// 客户端环境检查
const isClient = typeof window !== 'undefined'

// 拦截 fetch 请求来统计性能（仅在客户端）
if (isClient) {
  const originalFetch = window.fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    
    if (url.includes('/api/auth/verify')) {
      performanceStats.totalRequests++
      performanceStats.cacheMisses++
      performanceStats.lastRequestTime = Date.now()
      performanceStats.cacheHitRate = performanceStats.cacheHits / performanceStats.totalRequests
    }
    
    return originalFetch.call(this, input, init)
  }

  // 监听缓存命中事件（仅在客户端，减少日志输出）
  const originalConsoleLog = console.log
  console.log = function(...args: unknown[]) {
    const message = args.join(' ')
    
    if (message.includes('使用缓存') || message.includes('使用全局内存缓存') || message.includes('使用存储缓存')) {
      performanceStats.cacheHits++
      performanceStats.cacheHitRate = performanceStats.cacheHits / Math.max(performanceStats.totalRequests, 1)
    }
    
    // 过滤掉一些噪音日志
    if (!message.includes('性能监控') && !message.includes('Fast Refresh')) {
      originalConsoleLog.apply(this, args)
    }
  }
}

export default function AuthPerformanceMonitor() {
  const [stats, setStats] = useState<AuthPerformanceStats>(performanceStats)
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo>({
    tokenStatus: 'unknown',
    deviceFingerprint: '',
    authErrors: [],
    lastRefresh: null,
    refreshCount: 0
  })
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setStats({ ...performanceStats })
    }, 1000)

    let debugInterval: NodeJS.Timeout | null = null

    const updateDebugInfo = async () => {
      try {
        // 生成设备指纹用于调试
        const fingerprint = authManager.generateClientFingerprint()
        
        // 检查认证状态
        const authStatus = await authManager.checkAuthStatus()
        
        setDebugInfo(prev => ({
          ...prev,
          deviceFingerprint: fingerprint,
          tokenStatus: authStatus.isAuthenticated ? 'valid' : 
                      authStatus.error?.includes('过期') ? 'expired' : 
                      authStatus.error?.includes('未找到') ? 'missing' : 'unknown',
          authErrors: authStatus.error && authStatus.error !== '网络错误' ? 
                     [authStatus.error, ...prev.authErrors.slice(0, 2)] : prev.authErrors
        }))
      } catch (error) {
        // 只在调试模式下输出错误
        if (process.env.NODE_ENV === 'development') {
          console.error('更新调试信息失败:', error)
        }
        setDebugInfo(prev => ({
          ...prev,
          authErrors: [`调试信息更新失败`, ...prev.authErrors.slice(0, 2)]
        }))
      }
    }

    if (autoRefresh) {
      updateDebugInfo()
      debugInterval = setInterval(updateDebugInfo, 60000) // 改为60秒更新一次，减少频率
    }

    return () => {
      clearInterval(interval)
      if (debugInterval) {
        clearInterval(debugInterval)
      }
    }
  }, [autoRefresh])

  const resetStats = () => {
    performanceStats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      lastRequestTime: null
    }
    setStats({ ...performanceStats })
  }

  const handleManualRefresh = () => {
    setDebugInfo(prev => ({
      ...prev,
      lastRefresh: new Date().toLocaleTimeString(),
      refreshCount: prev.refreshCount + 1
    }))
  }

  const handleRefreshToken = async () => {
    try {
      const success = await authManager.refreshToken()
      setDebugInfo(prev => ({
        ...prev,
        authErrors: [`手动刷新token: ${success ? '成功' : '失败'}`, ...prev.authErrors.slice(0, 4)],
        lastRefresh: new Date().toLocaleTimeString()
      }))
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        authErrors: [`手动刷新token失败: ${error}`, ...prev.authErrors.slice(0, 4)]
      }))
    }
  }

  const clearErrors = () => {
    setDebugInfo(prev => ({
      ...prev,
      authErrors: []
    }))
  }

  // 防止 SSR 不匹配，只在客户端渲染
  if (!mounted) {
    return null
  }

  if (!isVisible && process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200"
          title="查看认证性能监控"
        >
          <Monitor size={20} />
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="text-blue-500" size={20} />
              <h3 className="font-semibold text-gray-800">认证性能监控</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle size={16} />
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">总请求数:</span>
              <span className="font-medium">{stats.totalRequests}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">缓存命中:</span>
              <span className="font-medium text-green-600">{stats.cacheHits}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">缓存未命中:</span>
              <span className="font-medium text-red-600">{stats.cacheMisses}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">缓存命中率:</span>
              <span className={`font-medium ${stats.cacheHitRate >= 0.8 ? 'text-green-600' : stats.cacheHitRate >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                {(stats.cacheHitRate * 100).toFixed(1)}%
              </span>
            </div>
            
            {stats.lastRequestTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">最后请求:</span>
                <span className="font-medium">
                  {Math.floor((Date.now() - stats.lastRequestTime) / 1000)}秒前
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700">
                {stats.cacheHitRate >= 0.8 ? '性能优异' : stats.cacheHitRate >= 0.5 ? '性能良好' : '需要优化'}
              </span>
            </div>
            
            <button
              onClick={resetStats}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded text-xs transition-colors duration-200"
            >
              重置统计
            </button>
          </div>
        </div>
      )}

      {/* 调试面板 */}
      {isVisible && (
        <div className="bg-black/90 text-green-400 p-4 rounded-lg text-xs font-mono max-w-md shadow-xl border border-green-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-green-300 font-bold">认证状态监控</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2 py-1 rounded text-xs ${
                  autoRefresh ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                {autoRefresh ? '自动' : '手动'}
              </button>
              <button
                onClick={handleManualRefresh}
                className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
              >
                刷新
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Token状态 */}
            <div className="flex justify-between">
              <span>Token状态:</span>
              <span className={`font-bold ${
                debugInfo.tokenStatus === 'valid' ? 'text-green-400' :
                debugInfo.tokenStatus === 'expired' ? 'text-yellow-400' :
                debugInfo.tokenStatus === 'missing' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {debugInfo.tokenStatus}
              </span>
            </div>

            {/* 设备指纹 */}
            <div>
              <span>设备指纹:</span>
              <div className="text-gray-300 break-all text-xs mt-1">
                {debugInfo.deviceFingerprint || '生成中...'}
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleRefreshToken}
                className="px-2 py-1 bg-yellow-600 rounded text-xs hover:bg-yellow-700"
              >
                刷新Token
              </button>
              <button
                onClick={clearErrors}
                className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
              >
                清除错误
              </button>
            </div>

            {/* 统计信息 */}
            <div className="text-xs text-gray-400 pt-2 border-t border-gray-600">
              <div>刷新次数: {debugInfo.refreshCount}</div>
              {debugInfo.lastRefresh && (
                <div>最后刷新: {debugInfo.lastRefresh}</div>
              )}
            </div>

            {/* 错误日志 */}
            {debugInfo.authErrors.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-600">
                <div className="text-red-400 font-bold mb-1">认证错误:</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {debugInfo.authErrors.map((error, index) => (
                    <div key={index} className="text-red-300 text-xs break-words">
                      {new Date().toLocaleTimeString()}: {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 