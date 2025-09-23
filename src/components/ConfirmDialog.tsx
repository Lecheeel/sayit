'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'error' | 'success'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  loading = false
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      default:
        return <Info className="w-6 h-6 text-blue-500" />
    }
  }

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'error':
        return 'bg-red-500 hover:bg-red-600 text-white'
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white'
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {getIcon()}
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonStyle()}`}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for using ConfirmDialog
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    confirmText: string
    cancelText: string
    type: 'info' | 'warning' | 'error' | 'success'
    onConfirm: () => void
    loading: boolean
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '确认',
    cancelText: '取消',
    type: 'info',
    onConfirm: () => {},
    loading: false
  })

  const showConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string
      cancelText?: string
      type?: 'info' | 'warning' | 'error' | 'success'
    }
  ) => {
    setDialog({
      isOpen: true,
      title,
      description,
      onConfirm,
      confirmText: options?.confirmText || '确认',
      cancelText: options?.cancelText || '取消',
      type: options?.type || 'info',
      loading: false
    })
  }

  const hideConfirm = () => {
    setDialog((prev: any) => ({
      ...prev,
      isOpen: false
    }))
  }

  const setLoading = (loading: boolean) => {
    setDialog((prev: any) => ({
      ...prev,
      loading
    }))
  }

  return {
    dialog,
    showConfirm,
    hideConfirm,
    setLoading
  }
} 