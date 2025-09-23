import React, { useState, useRef, useCallback } from 'react'
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  maxSizeInMB?: number
  showToast?: (message: string, type: 'success' | 'error') => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 9,
  maxSizeInMB = 5,
  showToast
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 图片压缩配置
  const compressionOptions = {
    maxSizeMB: maxSizeInMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8
  }

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (uploading) return

    const fileArray = Array.from(files)
    
    // 检查文件数量
    if (images.length + fileArray.length > maxImages) {
      showToast?.(`最多只能上传${maxImages}张图片`, 'error')
      return
    }

    // 验证文件类型
    const invalidFiles = fileArray.filter(file => !ALLOWED_TYPES.includes(file.type))
    if (invalidFiles.length > 0) {
      showToast?.('只支持 JPG、JPEG、PNG、WEBP 格式的图片', 'error')
      return
    }

    setUploading(true)

    try {
      // 压缩图片
      const compressedFiles: File[] = []
      for (const file of fileArray) {
        try {
          console.log('压缩前文件信息:', {
            name: file.name,
            type: file.type,
            size: file.size
          })
          
          const compressedFile = await imageCompression(file, compressionOptions)
          
          console.log('压缩后文件信息:', {
            name: compressedFile.name,
            type: compressedFile.type,
            size: compressedFile.size
          })
          
          // 确保压缩后的文件保持正确的文件名和扩展名
          const originalName = file.name
          const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
          const newFileName = `${nameWithoutExt}.webp`
          
          // 创建新的File对象，保持正确的文件名
          const renamedFile = new File([compressedFile], newFileName, {
            type: 'image/webp',
            lastModified: Date.now()
          })
          
          console.log('最终文件信息:', {
            name: renamedFile.name,
            type: renamedFile.type,
            size: renamedFile.size
          })
          
          compressedFiles.push(renamedFile)
        } catch (error) {
          console.error('图片压缩失败:', error)
          showToast?.(`图片 ${file.name} 压缩失败`, 'error')
          setUploading(false)
          return
        }
      }

      // 上传到服务器
      const formData = new FormData()
      compressedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        onImagesChange([...images, ...result.urls])
        showToast?.(`成功上传 ${result.urls.length} 张图片`, 'success')
      } else {
        showToast?.(result.message || '上传失败', 'error')
      }
    } catch (error) {
      console.error('上传失败:', error)
      showToast?.('上传失败，请重试', 'error')
    } finally {
      setUploading(false)
    }
  }, [images, onImagesChange, maxImages, maxSizeInMB, showToast, uploading])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    // 清空input值，允许重复选择相同文件
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center space-y-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400" />
          )}
          <div className="text-sm">
            <span className="font-medium text-blue-600">点击上传</span>
            <span className="text-gray-500"> 或拖拽图片到此处</span>
          </div>
          <div className="text-xs text-gray-400">
            支持 JPG、PNG、WEBP 格式，单张图片不超过 {maxSizeInMB}MB
          </div>
          <div className="text-xs text-gray-400">
            ({images.length}/{maxImages})
          </div>
        </div>
      </div>

      {/* 图片预览 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={imageUrl}
                alt={`预览 ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮（移动端友好） */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={handleFileSelect}
          disabled={uploading}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ImageIcon size={16} />
          )}
          {uploading ? '上传中...' : '添加图片'}
        </button>
      )}
    </div>
  )
} 