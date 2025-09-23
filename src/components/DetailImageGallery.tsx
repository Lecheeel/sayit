'use client'

import { useState } from 'react'
import Image from 'next/image'
import ImageViewer from './ImageViewer'

interface DetailImageGalleryProps {
  images: string[]
  alt?: string
  className?: string
}

export default function DetailImageGallery({ 
  images, 
  alt = '详情图片',
  className = ''
}: DetailImageGalleryProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setImageViewerOpen(true)
  }

  if (!images || images.length === 0) {
    return null
  }

  return (
    <>
      <div className={`mb-6 ${className}`}>
        <div className={`grid gap-3 ${
          images.length === 1 ? 'grid-cols-1 max-w-4xl mx-auto' :
          images.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto' :
          images.length === 3 ? 'grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'
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
                width={800}
                height={600}
                className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  images.length === 1 ? 'h-96 md:h-[500px]' : 'h-64 md:h-80'
                }`}
                priority={index === 0}
                unoptimized
              />
              {/* 统一的hover提示 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-2 left-2 text-white text-sm bg-black/60 px-2 py-1 rounded">
                  点击查看大图
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