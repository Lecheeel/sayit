import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Types for market query conditions
interface MarketWhereCondition {
  deletedAt: null
  status: 'AVAILABLE'
  category?: string
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const category = url.searchParams.get('category')
    const skip = (page - 1) * limit

    // 构建查询条件
    const whereCondition: MarketWhereCondition = {
      deletedAt: null,
      status: 'AVAILABLE' // 只显示可购买的商品
    }

    if (category && category !== 'all') {
      whereCondition.category = category
    }

    // 获取商品
    const items = await prisma.marketItem.findMany({
      where: whereCondition,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // 解析 JSON 字段
    const formattedItems = items.map((item) => ({
      ...item,
      images: JSON.parse(item.images)
    }))

    // 获取总数（用于分页）
    const total = await prisma.marketItem.count({
      where: whereCondition
    })

    return NextResponse.json({
      success: true,
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取商品失败:', error)
    return NextResponse.json(
      { error: '获取商品失败' },
      { status: 500 }
    )
  }
} 