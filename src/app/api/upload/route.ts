import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { authenticateRequest, getClientIP, logSecurityEvent } from '@/lib/auth'

// 支持的图片格式和MIME类型
const ALLOWED_TYPES = ['jpg', 'jpeg', 'png', 'webp']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880') // 默认5MB

// 验证文件是否为真实的图片文件
function validateImageFile(buffer: Buffer, mimeType: string): boolean {
  // 检查文件头标识符
  const fileSignatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF
  }
  
  const signature = fileSignatures[mimeType as keyof typeof fileSignatures]
  if (!signature) return false
  
  // 检查文件头是否匹配
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false
  }
  
  return true
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    // 服务端认证验证
    const { isAuthenticated, user } = authenticateRequest(request)
    
    if (!isAuthenticated || !user) {
      logSecurityEvent('UNAUTHORIZED_UPLOAD_ATTEMPT', { endpoint: '/api/upload' }, clientIP)
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: '请选择要上传的文件' },
        { status: 400 }
      )
    }

    // 限制文件数量
    if (files.length > 9) {
      logSecurityEvent('TOO_MANY_FILES_UPLOAD', { 
        userId: user.userId,
        fileCount: files.length 
      }, clientIP)
      return NextResponse.json(
        { success: false, message: '最多只能上传9张图片' },
        { status: 400 }
      )
    }

    const uploadedUrls: string[] = []
    const uploadDir = join(process.cwd(), 'public', 'uploads')

    // 确保上传目录存在
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {
      // 目录已存在或其他错误，继续执行
    }

    for (const file of files) {
      // 验证文件类型和MIME类型
      const fileName = file.name.toLowerCase()
      const fileExtension = fileName.split('.').pop()
      const mimeType = file.type
      
      console.log('上传文件详情:', {
        name: file.name,
        type: file.type,
        size: file.size,
        extension: fileExtension
      })
      
      // 验证扩展名
      if (!fileExtension || !ALLOWED_TYPES.includes(fileExtension)) {
        logSecurityEvent('INVALID_FILE_TYPE', { 
          userId: user.userId,
          fileName: file.name,
          fileType: fileExtension 
        }, clientIP)
        return NextResponse.json(
          { success: false, message: `不支持的文件格式。支持格式：${ALLOWED_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      
      // 验证MIME类型
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        logSecurityEvent('INVALID_MIME_TYPE', { 
          userId: user.userId,
          fileName: file.name,
          mimeType: mimeType 
        }, clientIP)
        return NextResponse.json(
          { success: false, message: '文件类型不匹配，可能存在安全风险' },
          { status: 400 }
        )
      }
      
      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        logSecurityEvent('FILE_TOO_LARGE', { 
          userId: user.userId,
          fileName: file.name,
          fileSize: file.size 
        }, clientIP)
        return NextResponse.json(
          { success: false, message: `文件 ${file.name} 超过5MB限制` },
          { status: 400 }
        )
      }

      // 转换文件为Buffer并验证内容
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // 验证文件内容是否为真实图片
      if (!validateImageFile(buffer, mimeType)) {
        logSecurityEvent('INVALID_FILE_CONTENT', { 
          userId: user.userId,
          fileName: file.name,
          mimeType: mimeType 
        }, clientIP)
        return NextResponse.json(
          { success: false, message: '文件内容验证失败，可能不是有效的图片文件' },
          { status: 400 }
        )
      }

      // 生成唯一文件名
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const uniqueFileName = `${timestamp}_${randomString}.${fileExtension}`
      
      const filePath = join(uploadDir, uniqueFileName)
      await writeFile(filePath, buffer)
      
      // 生成访问URL
      const fileUrl = `/uploads/${uniqueFileName}`
      uploadedUrls.push(fileUrl)
    }

    // 记录上传成功
    logSecurityEvent('FILES_UPLOADED', { 
      userId: user.userId,
      fileCount: files.length,
      fileUrls: uploadedUrls
    }, clientIP)

    return NextResponse.json({
      success: true,
      message: `成功上传 ${files.length} 张图片`,
      urls: uploadedUrls
    })

  } catch (error) {
    const clientIP = getClientIP(request)
    console.error('文件上传失败:', error)
    logSecurityEvent('UPLOAD_ERROR', { error: error instanceof Error ? error.message : 'unknown' }, clientIP)
    
    return NextResponse.json(
      { success: false, message: '文件上传失败，请重试' },
      { status: 500 }
    )
  }
} 