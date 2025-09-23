import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, validateContent, validatePrice, sanitizeInput, getClientIP, logSecurityEvent } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 服务端认证验证 - 不信任前端
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user) {
      logSecurityEvent('UNAUTHORIZED_MARKET_ATTEMPT', { endpoint: '/api/market/create' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, price, images = [], category, condition, location } = body

    // 验证标题
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      logSecurityEvent('INVALID_MARKET_TITLE', { userId: user.userId }, clientIP)
      return NextResponse.json(
        { success: false, message: '请输入商品标题' },
        { status: 400 }
      )
    }

    if (title.length > 100) {
      logSecurityEvent('MARKET_TITLE_TOO_LONG', { userId: user.userId, titleLength: title.length }, clientIP)
      return NextResponse.json(
        { success: false, message: '商品标题不能超过100字符' },
        { status: 400 }
      )
    }

    // 验证描述
    const descriptionValidation = validateContent(description, 2000) // 商品描述限制2000字符
    if (!descriptionValidation.isValid) {
      logSecurityEvent('INVALID_MARKET_DESCRIPTION', { 
        userId: user.userId, 
        reason: descriptionValidation.message 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: descriptionValidation.message },
        { status: 400 }
      )
    }

    // 验证价格
    const priceValidation = validatePrice(price)
    if (!priceValidation.isValid) {
      logSecurityEvent('INVALID_MARKET_PRICE', { 
        userId: user.userId, 
        price,
        reason: priceValidation.message 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: priceValidation.message },
        { status: 400 }
      )
    }

    // 验证分类 - 更新为与前端匹配的分类
    const validCategories = ['books', 'electronics', 'clothes', 'daily', 'sports', 'other']
    if (!category || !validCategories.includes(category)) {
      logSecurityEvent('INVALID_MARKET_CATEGORY', { 
        userId: user.userId, 
        category 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '请选择有效的商品分类' },
        { status: 400 }
      )
    }

    // 验证商品状况
    const validConditions = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']
    const finalCondition = condition || 'GOOD' // 默认为良好
    if (!validConditions.includes(finalCondition)) {
      logSecurityEvent('INVALID_MARKET_CONDITION', { 
        userId: user.userId, 
        condition: finalCondition 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '请选择有效的商品状况' },
        { status: 400 }
      )
    }

    // 清理输入数据
    const cleanTitle = sanitizeInput(title)
    const cleanDescription = sanitizeInput(description)
    const cleanLocation = location ? sanitizeInput(location) : ''
    
    // 验证图片数组
    if (!Array.isArray(images)) {
      logSecurityEvent('INVALID_MARKET_IMAGES', { 
        userId: user.userId,
        reason: 'images_not_array' 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '图片数据格式错误' },
        { status: 400 }
      )
    }

    // 限制图片数量
    if (images.length > 9) {
      logSecurityEvent('TOO_MANY_MARKET_IMAGES', { 
        userId: user.userId,
        imageCount: images.length 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '最多只能上传9张图片' },
        { status: 400 }
      )
    }

    // 验证图片URL
    const validImages = images.filter((img: string) => {
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

    // 创建商品
    const marketItem = await prisma.marketItem.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        price: priceValidation.value!,
        images: JSON.stringify(validImages),
        category,
        condition: finalCondition,
        location: cleanLocation,
        status: 'AVAILABLE',
        sellerId: user.userId
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    // 记录创建成功
    logSecurityEvent('MARKET_ITEM_CREATED', { 
      userId: user.userId,
      itemId: marketItem.id,
      category: marketItem.category,
      price: marketItem.price 
    }, clientIP)

    // 返回创建的商品
    return NextResponse.json({
      success: true,
      message: '商品发布成功',
      data: {
        ...marketItem,
        images: JSON.parse(marketItem.images)
      }
    })

  } catch (error) {
    const clientIP = getClientIP(request)
    console.error('创建商品失败:', error)
    logSecurityEvent('MARKET_CREATE_ERROR', { error: error instanceof Error ? error.message : 'unknown' }, clientIP)
    
    return NextResponse.json(
      { success: false, message: '创建商品失败，请重试' },
      { status: 500 }
    )
  }
} 