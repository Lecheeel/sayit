'use client'

import { useEffect, useState } from 'react'

interface PerformanceData {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  totalRenderTime: number
}

interface PerformanceMonitorProps {
  componentName: string
  enabled?: boolean
  showDebugInfo?: boolean
}

export default function PerformanceMonitor({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development',
  showDebugInfo = false 
}: PerformanceMonitorProps) {
  const [perfData, setPerfData] = useState<PerformanceData>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0
  })

  useEffect(() => {
    if (!enabled) return

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      setPerfData(prev => {
        const newRenderCount = prev.renderCount + 1
        const newTotalTime = prev.totalRenderTime + renderTime
        const newAverageTime = newTotalTime / newRenderCount
        
        // 如果渲染时间过长，发出警告
        if (renderTime > 100) {
          console.warn(`⚠️ 慢渲染检测: ${componentName} 渲染耗时 ${renderTime.toFixed(2)}ms`)
        }
        
        return {
          renderCount: newRenderCount,
          lastRenderTime: renderTime,
          averageRenderTime: newAverageTime,
          totalRenderTime: newTotalTime
        }
      })
    }
  })

  // 检测内存泄漏和异常重复渲染
  useEffect(() => {
    if (!enabled) return
    
    if (perfData.renderCount > 100) {
      console.warn(`🔥 高频渲染警告: ${componentName} 已渲染 ${perfData.renderCount} 次，可能存在性能问题`)
    }
  }, [perfData.renderCount, componentName, enabled])

  if (!enabled || !showDebugInfo) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-2 rounded-lg font-mono z-50">
      <div className="text-yellow-300 font-semibold">{componentName}</div>
      <div>渲染次数: {perfData.renderCount}</div>
      <div>最后渲染: {perfData.lastRenderTime.toFixed(2)}ms</div>
      <div>平均渲染: {perfData.averageRenderTime.toFixed(2)}ms</div>
      {perfData.lastRenderTime > 50 && (
        <div className="text-red-300">⚠️ 渲染较慢</div>
      )}
      {perfData.renderCount > 20 && (
        <div className="text-orange-300">🔥 渲染频繁</div>
      )}
    </div>
  )
}

// 自定义Hook用于监控组件性能
export function useRenderCount(componentName: string) {
  const [renderCount, setRenderCount] = useState(0)
  
  useEffect(() => {
    setRenderCount(prev => {
      const newCount = prev + 1
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 ${componentName} 渲染 #${newCount}`)
      }
      return newCount
    })
  })
  
  return renderCount
} 