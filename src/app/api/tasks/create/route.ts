import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, validateContent, validatePrice, sanitizeInput, getClientIP, logSecurityEvent } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 服务端认证验证 - 不信任前端
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user) {
      logSecurityEvent('UNAUTHORIZED_TASK_ATTEMPT', { endpoint: '/api/tasks/create' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

      const body = await request.json()
  const { title, description, images = [], reward, category, deadline } = body

    // 验证标题
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      logSecurityEvent('INVALID_TASK_TITLE', { userId: user.userId }, clientIP)
      return NextResponse.json(
        { success: false, message: '请输入任务标题' },
        { status: 400 }
      )
    }

    if (title.length > 100) {
      logSecurityEvent('TASK_TITLE_TOO_LONG', { userId: user.userId, titleLength: title.length }, clientIP)
      return NextResponse.json(
        { success: false, message: '任务标题不能超过100字符' },
        { status: 400 }
      )
    }

    // 验证描述
    const descriptionValidation = validateContent(description, 3000) // 任务描述限制3000字符
    if (!descriptionValidation.isValid) {
      logSecurityEvent('INVALID_TASK_DESCRIPTION', { 
        userId: user.userId, 
        reason: descriptionValidation.message 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: descriptionValidation.message },
        { status: 400 }
      )
    }

    // 验证悬赏金额
    const rewardValidation = validatePrice(reward)
    if (!rewardValidation.isValid) {
      logSecurityEvent('INVALID_TASK_REWARD', { 
        userId: user.userId, 
        reward,
        reason: rewardValidation.message 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: `悬赏金额${rewardValidation.message}` },
        { status: 400 }
      )
    }

    // 验证分类 - 更新为与前端匹配的分类
    const validCategories = ['study', 'delivery', 'proxy', 'tech', 'other']
    if (!category || !validCategories.includes(category)) {
      logSecurityEvent('INVALID_TASK_CATEGORY', { 
        userId: user.userId, 
        category 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '请选择有效的任务分类' },
        { status: 400 }
      )
    }

    // 验证截止时间（可选）
    let deadlineDate = null
    if (deadline) {
      try {
        deadlineDate = new Date(deadline)
        const now = new Date()
        
        if (deadlineDate <= now) {
          logSecurityEvent('INVALID_TASK_DEADLINE', { 
            userId: user.userId, 
            deadline,
            reason: 'past_date' 
          }, clientIP)
          return NextResponse.json(
            { success: false, message: '截止时间不能早于现在' },
            { status: 400 }
          )
        }

        // 限制截止时间不能超过1年
        const oneYearFromNow = new Date()
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
        
        if (deadlineDate > oneYearFromNow) {
          logSecurityEvent('INVALID_TASK_DEADLINE', { 
            userId: user.userId, 
            deadline,
            reason: 'too_far_future' 
          }, clientIP)
          return NextResponse.json(
            { success: false, message: '截止时间不能超过一年' },
            { status: 400 }
          )
        }
      } catch (error) {
        logSecurityEvent('INVALID_TASK_DEADLINE_FORMAT', { 
          userId: user.userId, 
          deadline 
        }, clientIP)
        return NextResponse.json(
          { success: false, message: '截止时间格式无效' },
          { status: 400 }
        )
      }
    }

    // 验证图片数组
    if (!Array.isArray(images)) {
      logSecurityEvent('INVALID_TASK_IMAGES', { 
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
      logSecurityEvent('TOO_MANY_TASK_IMAGES', { 
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

    // 清理输入数据
    const cleanTitle = sanitizeInput(title)
    const cleanDescription = sanitizeInput(description)

    // 创建任务
    const task = await prisma.task.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        images: JSON.stringify(validImages),
        reward: rewardValidation.value!,
        category,
        deadline: deadlineDate,
        status: 'OPEN',
        publisherId: user.userId
      },
      include: {
        publisher: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        acceptor: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    // 记录创建成功
    logSecurityEvent('TASK_CREATED', { 
      userId: user.userId,
      taskId: task.id,
      category: task.category,
      reward: task.reward 
    }, clientIP)

    // 返回创建的任务
    return NextResponse.json({
      success: true,
      message: '任务发布成功',
      data: {
        ...task,
        images: JSON.parse(task.images)
      }
    })

  } catch (error) {
    const clientIP = getClientIP(request)
    console.error('创建任务失败:', error)
    logSecurityEvent('TASK_CREATE_ERROR', { error: error instanceof Error ? error.message : 'unknown' }, clientIP)
    
    return NextResponse.json(
      { success: false, message: '创建任务失败，请重试' },
      { status: 500 }
    )
  }
} 