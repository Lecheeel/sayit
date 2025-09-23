import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Tailwind CSS 类名合并工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 时间格式化工具
export function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 一分钟内
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  
  // 一小时内
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}分钟前`
  }
  
  // 一天内
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  }
  
  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }
  
  // 超过一周，显示具体日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 分页计算工具
export function calculatePagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev
  }
}

// 邮箱验证
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 学号验证（简单示例，可根据实际需求调整）
export function isValidStudentId(studentId: string): boolean {
  // 假设学号为8-12位数字
  const studentIdRegex = /^\d{8,12}$/
  return studentIdRegex.test(studentId)
}

// 密码强度验证
export function isValidPassword(password: string): boolean {
  // 至少8位，包含字母和数字
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
  return passwordRegex.test(password)
}

// 文本截断
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 价格格式化
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

// 生成随机字符串
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 数组去重
export function uniqueArray<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

// 延迟执行
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 记录浏览量
export async function recordView(targetId: string, targetType: 'post' | 'confession' | 'market' | 'task') {
  try {
    // 根据不同类型使用不同的API路径
    let apiPath = '/api/views'
    let requestBody: any = {}

    switch (targetType) {
      case 'post':
        requestBody = { postId: targetId }
        break
      case 'confession':
        // 表白墙的浏览量记录
        requestBody = { confessionId: targetId }
        break
      case 'market':
        // 市场物品的浏览量记录
        requestBody = { marketItemId: targetId }
        break
      case 'task':
        // 任务的浏览量记录
        requestBody = { taskId: targetId }
        break
      default:
        return { success: false, error: '不支持的内容类型' }
    }

    const response = await fetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('记录浏览量失败:', error)
    return { success: false, error: '记录浏览量失败' }
  }
}

// 获取互动统计数据
export async function getInteractionStats(targetId: string, targetType: 'post' | 'confession' | 'comment' | 'market' | 'task') {
  try {
    const promises = []

    // 获取点赞数据
    promises.push(
      fetch(`/api/likes?targetId=${targetId}&targetType=${targetType}`)
        .then(res => res.json())
        .catch(() => ({ success: false, likeCount: 0, isLiked: false }))
    )

    // 获取评论数据（仅对帖子、表白墙）
    if (targetType === 'post' || targetType === 'confession') {
      promises.push(
        fetch(`/api/comments?targetId=${targetId}&targetType=${targetType}&limit=1`)
          .then(res => res.json())
          .catch(() => ({ success: false, pagination: { total: 0 } }))
      )
    }

    // 获取浏览量数据（仅对帖子）
    if (targetType === 'post') {
      promises.push(
        fetch(`/api/views?postId=${targetId}`)
          .then(res => res.json())
          .catch(() => ({ success: false, viewCount: 0 }))
      )
    }

    const results = await Promise.all(promises)
    const [likeResult, commentResult, viewResult] = results

    return {
      likes: likeResult.success ? likeResult.likeCount : 0,
      isLiked: likeResult.success ? likeResult.isLiked : false,
      comments: commentResult ? (commentResult.success ? commentResult.pagination.total : 0) : 0,
      views: viewResult ? (viewResult.success ? viewResult.viewCount : 0) : 0
    }
  } catch (error) {
    console.error('获取互动统计失败:', error)
    return {
      likes: 0,
      isLiked: false,
      comments: 0,
      views: 0
    }
  }
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 数字格式化（千分位）
export function formatNumber(num: number): string {
  if (num < 1000) return num.toString()
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K'
  return (num / 1000000).toFixed(1) + 'M'
} 