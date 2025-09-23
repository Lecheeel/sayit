import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params
    const filePath = path.join('/')
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath)
    
    // 安全检查：确保文件路径在uploads目录内
    if (!fullPath.includes(join(process.cwd(), 'public', 'uploads'))) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // 检查文件是否存在
    if (!existsSync(fullPath)) {
      console.error('文件不存在:', fullPath)
      return new NextResponse('File not found', { status: 404 })
    }
    
    // 读取文件
    const fileBuffer = await readFile(fullPath)
    
    // 获取文件扩展名来设置正确的Content-Type
    const ext = filePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case 'webp':
        contentType = 'image/webp'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
    }
    
    // 设置缓存头 - 将Buffer转换为Uint8Array
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
    
    return response
    
  } catch (error) {
    console.error('静态文件服务错误:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 