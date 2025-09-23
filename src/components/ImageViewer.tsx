'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageViewerProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageViewer({ 
  images, 
  initialIndex = 0, 
  isOpen, 
  onClose 
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  // 当ImageViewer打开或initialIndex改变时，更新currentIndex
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  // 重置状态当图片改变时
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [currentIndex])

  const goToPrevious = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    }
  }, [images.length])

  const goToNext = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    }
  }, [images.length])

  // 监听键盘事件
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goToPrevious, goToNext])

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // 监听滚轮事件（非被动监听器）
  useEffect(() => {
    const handleWheelEvent = (e: WheelEvent) => {
      if (!isOpen || !imageRef.current) return
      
      // 检查事件是否发生在图片容器内
      const rect = imageRef.current.getBoundingClientRect()
      const isInImageArea = e.clientX >= rect.left && e.clientX <= rect.right &&
                           e.clientY >= rect.top && e.clientY <= rect.bottom
      
      if (isInImageArea) {
        e.preventDefault()
        const scaleChange = e.deltaY > 0 ? 0.9 : 1.1
        const newScale = Math.max(0.5, Math.min(4, scale * scaleChange))
        setScale(newScale)
        
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 })
        }
      }
    }

    if (isOpen && imageRef.current) {
      // 添加非被动事件监听器
      imageRef.current.addEventListener('wheel', handleWheelEvent, { passive: false })
    }

    return () => {
      if (imageRef.current) {
        imageRef.current.removeEventListener('wheel', handleWheelEvent)
      }
    }
  }, [isOpen, scale])

  // 处理点击事件
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // 处理双击缩放
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  // 触摸事件处理
  const [touches, setTouches] = useState<React.Touch[]>([])
  const [lastTouchDistance, setLastTouchDistance] = useState(0)

  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // 使用 CSS touchAction: 'none' 来处理触摸行为，避免 passive event listener 错误
    const touchList = Array.from(e.touches)
    setTouches(touchList)

    if (touchList.length === 2) {
      // 双指操作
      const distance = getTouchDistance(touchList[0], touchList[1])
      setLastTouchDistance(distance)
    } else if (touchList.length === 1 && scale > 1) {
      // 单指拖拽（仅在放大状态下）
      setIsDragging(true)
      setDragStart({
        x: touchList[0].clientX - position.x,
        y: touchList[0].clientY - position.y
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchList = Array.from(e.touches)

    if (touchList.length === 2) {
      // 双指缩放
      const distance = getTouchDistance(touchList[0], touchList[1])
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance
        const newScale = Math.max(0.5, Math.min(4, scale * scaleChange))
        setScale(newScale)
      }
      setLastTouchDistance(distance)
    } else if (touchList.length === 1 && isDragging && scale > 1) {
      // 单指拖拽
      setPosition({
        x: touchList[0].clientX - dragStart.x,
        y: touchList[0].clientY - dragStart.y
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setLastTouchDistance(0)
    setTouches([])
  }

  // 鼠标事件处理（用于桌面端）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }



  if (!isOpen) return null

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex items-center justify-center"
      onClick={handleContainerClick}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
      >
        <X size={24} />
      </button>

      {/* 左右切换按钮 */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-[10000] p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-[10000] p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* 图片计数器 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[10000] px-4 py-2 bg-black bg-opacity-50 text-white rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* 图片容器 */}
      <div 
        ref={imageRef}
        className="relative max-w-full max-h-full cursor-pointer select-none touch-none"
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
          touchAction: 'none' // 禁用触摸手势，避免与自定义手势冲突
        }}
      >
        <Image
          src={images[currentIndex]}
          alt={`图片 ${currentIndex + 1}`}
          width={1200}
          height={800}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          priority
          draggable={false}
        />
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] px-4 py-2 bg-black bg-opacity-50 text-white rounded-full text-xs text-center">
        <div>双击缩放 • 滚轮缩放 • ESC退出</div>
        {images.length > 1 && <div>← → 切换图片</div>}
      </div>
    </div>
  )
} 