import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { type } = body

    if (!type || !['confession', 'post', 'market', 'task'].includes(type)) {
      return NextResponse.json(
        { success: false, message: '无效的内容类型' },
        { status: 400 }
      )
    }

    // 根据类型删除对应的内容
    switch (type) {
      case 'confession':
        await prisma.confession.update({
          where: { id },
          data: { deletedAt: new Date() }
        })
        break
      
      case 'post':
        await prisma.post.update({
          where: { id },
          data: { deletedAt: new Date() }
        })
        break
        
      case 'market':
        await prisma.marketItem.update({
          where: { id },
          data: { deletedAt: new Date() }
        })
        break
        
      case 'task':
        await prisma.task.update({
          where: { id },
          data: { deletedAt: new Date() }
        })
        break
        
      default:
        return NextResponse.json(
          { success: false, message: '不支持的内容类型' },
          { status: 400 }
        )
    }

    console.log(`管理员 ${user.username} 删除了 ${type} 内容: ${id}`)

    return NextResponse.json({
      success: true,
      message: '内容删除成功'
    })
    
  } catch (error) {
    console.error('管理员删除内容失败:', error)
    return NextResponse.json(
      { success: false, message: '删除失败' },
      { status: 500 }
    )
  }
} 