import { NextRequest, NextResponse } from 'next/server'
import { fetchContentStatsParallel } from '@/lib/parallel-data-fetcher'
import { authenticateRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()
    
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的请求数据' },
        { status: 400 }
      )
    }

    // 验证items格式
    const validItems = items.filter(item => 
      item.id && 
      item.type && 
      ['post', 'confession', 'market', 'task'].includes(item.type)
    )

    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有有效的数据项' },
        { status: 400 }
      )
    }

    // 获取用户信息（可选）
    const { user } = authenticateRequest(request)

    // 批量获取统计数据
    const statsMap = await fetchContentStatsParallel(validItems, user?.userId)

    // 转换为数组格式
    const statsArray = validItems.map(item => ({
      targetId: item.id,
      targetType: item.type,
      ...(statsMap.get(item.id) || {
        likes: 0,
        comments: 0,
        views: 0,
        isLiked: false
      })
    }))

    return NextResponse.json({
      success: true,
      data: statsArray
    })

  } catch (error) {
    console.error('批量获取统计数据失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
} 