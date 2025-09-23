import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    // 获取各种统计数据
    const [
      totalUsers,
      totalConfessions, 
      totalPosts,
      totalMarketItems,
      totalTasks,
      totalComments,
      totalLikes
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.confession.count({ where: { deletedAt: null } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.marketItem.count({ where: { deletedAt: null } }),
      prisma.task.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.like.count()
    ])

    const stats = {
      totalUsers,
      totalConfessions,
      totalPosts, 
      totalMarketItems,
      totalTasks,
      totalComments,
      totalLikes
    }

    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('获取管理员统计数据失败:', error)
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    )
  }
} 