'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import ImageViewer from './ImageViewer'

interface CommentImageGalleryProps {
  images: string[]
  onRemoveImage?: (index: number) => void
  editable?: boolean
  size?: 'sm' | 'md' | 'lg'
  alt?: string
  className?: string
}

export default function CommentImageGallery({ 
  images, 
  onRemoveImage,
  editable = false,
  size = 'md',
  alt = '评论图片',
  className = ''
}: CommentImageGalleryProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setImageViewerOpen(true)
  }

  const handleRemoveImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onRemoveImage?.(index)
  }

  if (!images || images.length === 0) {
    return null
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          grid: 'gap-2',
          image: 'h-20',
          remove: 'w-4 h-4'
        }
      case 'lg':
        return {
          grid: 'gap-4',
          image: 'h-64',
          remove: 'w-6 h-6'
        }
      default:
        return {
          grid: 'gap-3',
          image: 'h-32',
          remove: 'w-5 h-5'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  return (
    <>
      <div className={`${className}`}>
        <div className={`grid ${sizeClasses.grid} ${
          images.length === 1 ? 'grid-cols-1' :
          images.length === 2 ? 'grid-cols-2' :
          images.length === 3 ? 'grid-cols-3' :
          'grid-cols-2 sm:grid-cols-3'
        }`}>
          {images.map((image, index) => (
            <div 
              key={index} 
              className="relative group rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => handleImageClick(index)}
            >
              <Image
                src={image}
                alt={`${alt} ${index + 1}`}
                width={200}
                height={150}
                className={`w-full ${sizeClasses.image} object-cover transition-transform duration-200 group-hover:scale-105`}
                unoptimized
              />
              
              {/* 删除按钮 */}
              {editable && onRemoveImage && (
                <button
                  onClick={(e) => handleRemoveImage(index, e)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  title="删除图片"
                >
                  <X size={sizeClasses.remove.split(' ')[0] === 'w-4' ? 12 : sizeClasses.remove.split(' ')[0] === 'w-6' ? 16 : 14} />
                </button>
              )}
              
              {/* hover提示 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-1 left-1 text-white text-xs bg-black/60 px-1 py-0.5 rounded">
                  查看大图
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 图片查看器 */}
      <ImageViewer
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />
    </>
  )
} 