import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await prisma.marketItem.findUnique({
      where: {
        id: id,
        deletedAt: null
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

    if (!item) {
      return NextResponse.json(
        { success: false, error: '找不到这件商品' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        images: JSON.parse(item.images || '[]'),
        category: item.category,
        condition: item.condition,
        status: item.status,
        location: item.location,
        createdAt: item.createdAt,
        seller: item.seller
      }
    })
  } catch (error) {
    console.error('获取商品详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取商品详情失败' },
      { status: 500 }
    )
  }
} 