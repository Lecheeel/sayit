// API 输入验证器 - 抽象重复的验证逻辑
import { NextRequest } from 'next/server'
import { validateContent, validatePrice, sanitizeInput, authenticateRequest, getClientIP, logSecurityEvent } from './auth'

// 通用验证结果接口
export interface ValidationResult {
  isValid: boolean
  message?: string
  cleanData?: any
}

// 认证验证器
export async function validateAuthentication(request: NextRequest): Promise<{
  isValid: boolean
  user?: any
  clientIP: string
  message?: string
}> {
  const clientIP = getClientIP(request)
  const { isAuthenticated, user } = authenticateRequest(request)
  
  if (!isAuthenticated || !user) {
    return {
      isValid: false,
      clientIP,
      message: '请先登录'
    }
  }

  return {
    isValid: true,
    user,
    clientIP
  }
}

// 标题验证器
export function validateTitle(title: any, maxLength: number = 100): ValidationResult {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { isValid: false, message: '请输入标题' }
  }

  if (title.length > maxLength) {
    return { isValid: false, message: `标题不能超过${maxLength}字符` }
  }

  return {
    isValid: true,
    cleanData: sanitizeInput(title)
  }
}

// 分类验证器
export function validateCategory(category: any, validCategories: string[]): ValidationResult {
  if (!category || !validCategories.includes(category)) {
    return { isValid: false, message: '请选择有效的分类' }
  }

  return { isValid: true, cleanData: category }
}

// 图片数组验证器
export function validateImages(images: any, maxCount: number = 9): ValidationResult {
  if (!Array.isArray(images)) {
    return { isValid: false, message: '图片数据格式错误' }
  }

  if (images.length > maxCount) {
    return { isValid: false, message: `最多只能上传${maxCount}张图片` }
  }

  // 验证图片URL
  const validImages = images.filter((img: any) => {
    if (typeof img !== 'string') return false
    // 允许相对路径（如 /uploads/xxx.jpg）和完整URL
    if (img.startsWith('/uploads/')) return true
    try {
      new URL(img)
      return true
    } catch {
      return false
    }
  })

  return { isValid: true, cleanData: validImages }
}

// 标签验证器
export function validateTags(tags: any, maxCount: number = 10): ValidationResult {
  if (!Array.isArray(tags)) {
    return { isValid: false, message: '标签数据格式错误' }
  }

  if (tags.length > maxCount) {
    return { isValid: false, message: `最多只能添加${maxCount}个标签` }
  }

  const validTags = tags.filter((tag: any) => {
    if (typeof tag !== 'string') return false
    const cleanTag = tag.trim()
    return cleanTag.length > 0 && cleanTag.length <= 20
  }).map((tag: string) => sanitizeInput(tag))

  return { isValid: true, cleanData: validTags }
}

// 时间验证器（用于任务截止时间等）
export function validateDateTime(dateTimeStr: any, fieldName: string = '时间'): ValidationResult {
  if (!dateTimeStr) {
    return { isValid: true, cleanData: null } // 允许为空
  }

  try {
    const dateTime = new Date(dateTimeStr)
    const now = new Date()
    
    if (dateTime <= now) {
      return { isValid: false, message: `${fieldName}不能早于现在` }
    }

    // 限制不能超过1年
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    if (dateTime > oneYearFromNow) {
      return { isValid: false, message: `${fieldName}不能超过一年` }
    }

    return { isValid: true, cleanData: dateTime }
  } catch (error) {
    return { isValid: false, message: `${fieldName}格式无效` }
  }
}

// 位置验证器
export function validateLocation(location: any): ValidationResult {
  if (!location) {
    return { isValid: true, cleanData: '' }
  }

  if (typeof location !== 'string') {
    return { isValid: false, message: '位置格式错误' }
  }

  if (location.length > 100) {
    return { isValid: false, message: '位置描述不能超过100字符' }
  }

  return { isValid: true, cleanData: sanitizeInput(location) }
}

// 通用创建验证器
export class CreateValidator {
  // 验证帖子创建数据
  static validatePost(data: any): ValidationResult {
    const { title, content, images = [], category, tags = [] } = data

    // 验证标题
    const titleValidation = validateTitle(title)
    if (!titleValidation.isValid) {
      return titleValidation
    }

    // 验证内容
    const contentValidation = validateContent(content, 5000)
    if (!contentValidation.isValid) {
      return { isValid: false, message: contentValidation.message }
    }

    // 验证分类
    const validCategories = ['study', 'life', 'entertainment', 'sports', 'food', 'other']
    const categoryValidation = validateCategory(category, validCategories)
    if (!categoryValidation.isValid) {
      return categoryValidation
    }

    // 验证图片
    const imagesValidation = validateImages(images)
    if (!imagesValidation.isValid) {
      return imagesValidation
    }

    // 验证标签
    const tagsValidation = validateTags(tags)
    if (!tagsValidation.isValid) {
      return tagsValidation
    }

    return {
      isValid: true,
      cleanData: {
        title: titleValidation.cleanData,
        content: sanitizeInput(content),
        images: imagesValidation.cleanData,
        category: categoryValidation.cleanData || 'other',
        tags: tagsValidation.cleanData
      }
    }
  }

  // 验证表白创建数据
  static validateConfession(data: any): ValidationResult {
    const { content, images = [], isAnonymous = true } = data

    // 验证内容
    const contentValidation = validateContent(content, 1000)
    if (!contentValidation.isValid) {
      return { isValid: false, message: contentValidation.message }
    }

    // 验证图片
    const imagesValidation = validateImages(images)
    if (!imagesValidation.isValid) {
      return imagesValidation
    }

    return {
      isValid: true,
      cleanData: {
        content: sanitizeInput(content),
        images: imagesValidation.cleanData,
        isAnonymous: Boolean(isAnonymous)
      }
    }
  }

  // 验证商品创建数据
  static validateMarketItem(data: any): ValidationResult {
    const { title, description, price, images = [], category, condition, location } = data

    // 验证标题
    const titleValidation = validateTitle(title)
    if (!titleValidation.isValid) {
      return titleValidation
    }

    // 验证描述
    const descriptionValidation = validateContent(description, 2000)
    if (!descriptionValidation.isValid) {
      return { isValid: false, message: descriptionValidation.message }
    }

    // 验证价格
    const priceValidation = validatePrice(price)
    if (!priceValidation.isValid) {
      return { isValid: false, message: priceValidation.message }
    }

    // 验证分类
    const validCategories = ['books', 'electronics', 'clothes', 'daily', 'sports', 'other']
    const categoryValidation = validateCategory(category, validCategories)
    if (!categoryValidation.isValid) {
      return categoryValidation
    }

    // 验证商品状况
    const validConditions = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']
    const finalCondition = condition || 'GOOD'
    if (!validConditions.includes(finalCondition)) {
      return { isValid: false, message: '请选择有效的商品状况' }
    }

    // 验证图片
    const imagesValidation = validateImages(images)
    if (!imagesValidation.isValid) {
      return imagesValidation
    }

    // 验证位置
    const locationValidation = validateLocation(location)
    if (!locationValidation.isValid) {
      return locationValidation
    }

    return {
      isValid: true,
      cleanData: {
        title: titleValidation.cleanData,
        description: sanitizeInput(description),
        price: priceValidation.value,
        images: imagesValidation.cleanData,
        category: categoryValidation.cleanData,
        condition: finalCondition,
        location: locationValidation.cleanData
      }
    }
  }

  // 验证任务创建数据
  static validateTask(data: any): ValidationResult {
    const { title, description, reward, category, deadline } = data

    // 验证标题
    const titleValidation = validateTitle(title)
    if (!titleValidation.isValid) {
      return titleValidation
    }

    // 验证描述
    const descriptionValidation = validateContent(description, 3000)
    if (!descriptionValidation.isValid) {
      return { isValid: false, message: descriptionValidation.message }
    }

    // 验证悬赏金额
    const rewardValidation = validatePrice(reward)
    if (!rewardValidation.isValid) {
      return { isValid: false, message: `悬赏金额${rewardValidation.message}` }
    }

    // 验证分类
    const validCategories = ['study', 'delivery', 'proxy', 'tech', 'other']
    const categoryValidation = validateCategory(category, validCategories)
    if (!categoryValidation.isValid) {
      return categoryValidation
    }

    // 验证截止时间
    const deadlineValidation = validateDateTime(deadline, '截止时间')
    if (!deadlineValidation.isValid) {
      return deadlineValidation
    }

    return {
      isValid: true,
      cleanData: {
        title: titleValidation.cleanData,
        description: sanitizeInput(description),
        reward: rewardValidation.value,
        category: categoryValidation.cleanData,
        deadline: deadlineValidation.cleanData
      }
    }
  }
} 