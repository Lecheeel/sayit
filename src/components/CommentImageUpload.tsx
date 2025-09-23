'use client'

import React, { useState, useRef } from 'react'
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import Toast, { useToast } from './Toast'

interface CommentImageUploadProps {
  onUploadSuccess: (urls: string[]) => void
  multiple?: boolean
  maxFiles?: number
  maxSizeInMB?: number
}

export default function CommentImageUpload({
  onUploadSuccess,
  multiple = true,
  maxFiles = 9,
  maxSizeInMB = 5
}: CommentImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast, showToast, hideToast } = useToast()

  const compressionOptions = {
    maxSizeMB: maxSizeInMB,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8
  }

  const handleFileUpload = async (files: FileList) => {
    if (uploading) return

    const fileArray = Array.from(files)
    
    if (fileArray.length > maxFiles) {
      showToast(`最多只能上传${maxFiles}张图片`, 'warning')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalidFiles = fileArray.filter(file => !allowedTypes.includes(file.type))
    if (invalidFiles.length > 0) {
      showToast('只支持 JPG、JPEG、PNG、WEBP 格式的图片', 'warning')
      return
    }

    setUploading(true)

    try {
      const compressedFiles: File[] = []
      for (const file of fileArray) {
        try {
          const compressedFile = await imageCompression(file, compressionOptions)
          const originalName = file.name
          const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
          const newFileName = `${nameWithoutExt}.webp`
          
          const renamedFile = new File([compressedFile], newFileName, {
            type: 'image/webp',
            lastModified: Date.now()
          })
          
          compressedFiles.push(renamedFile)
        } catch (error) {
          console.error('图片压缩失败:', error)
          showToast(`图片 ${file.name} 压缩失败`, 'error')
          setUploading(false)
          return
        }
      }

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
        onUploadSuccess(result.urls)
        showToast('图片上传成功！', 'success')
      } else {
        showToast(result.message || '上传失败', 'error')
      }
    } catch (error) {
      console.error('上传失败:', error)
      showToast('上传失败，请重试', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    e.target.value = ''
  }

  return (
    <>
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div
          className={`
            border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-colors cursor-pointer hover:border-gray-400
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={handleFileSelect}
        >
          {uploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="text-sm text-gray-500">上传中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload size={24} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                点击上传图片 (最多{maxFiles}张)
              </span>
            </div>
          )}
        </div>
      </div>
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  )
} 