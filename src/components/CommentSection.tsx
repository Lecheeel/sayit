'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Send, User, MoreHorizontal, Image as ImageIcon, ThumbsUp, Clock } from 'lucide-react'
import { useAuthContext } from '@/lib/auth-context'
import LikeButton from './LikeButton'
import CommentImageUpload from './CommentImageUpload'
import CommentImageGallery from './CommentImageGallery'
import InteractionStats from './InteractionStats'
import Toast, { useToast } from './Toast'

interface Comment {
  id: string
  content: string
  images: string[]
  createdAt: string
  author: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
  replies: Reply[]
  stats: {
    likes: number
    replies: number
  }
}

interface Reply {
  id: string
  content: string
  images: string[]
  createdAt: string
  author: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
  stats: {
    likes: number
  }
}

interface CommentSectionProps {
  targetId: string
  targetType: 'confession' | 'post' | 'market' | 'task'
  initialCommentCount?: number
}

export default function CommentSection({
  targetId,
  targetType,
  initialCommentCount = 0
}: CommentSectionProps) {
  const { isAuthenticated, user } = useAuthContext()
  const { toast, showToast, hideToast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [newCommentImages, setNewCommentImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'time' | 'likes'>('time')
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showReplyImageUpload, setShowReplyImageUpload] = useState(false)

  // 加载评论
  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/comments?targetId=${targetId}&targetType=${targetType}&sortBy=${sortBy}`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setComments(data.comments)
          }
        }
      } catch (error) {
        console.error('获取评论失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchComments()
  }, [targetId, targetType, sortBy])

  // 提交评论
  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      showToast('请先登录后再评论', 'warning')
      return
    }

    if (!newComment.trim()) {
      showToast('请输入评论内容', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment.trim(),
          targetId,
          targetType,
          images: newCommentImages
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setComments(prev => [data.comment, ...prev])
          setNewComment('')
          setNewCommentImages([])
          setShowImageUpload(false)
          showToast('评论发表成功！', 'success')
        }
      } else {
        const data = await response.json()
        showToast(data.error || '发表评论失败', 'error')
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      showToast('发表评论失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // 提交回复
  const handleSubmitReply = async (parentId: string) => {
    if (!isAuthenticated) {
      showToast('请先登录后再回复', 'warning')
      return
    }

    if (!replyContent.trim()) {
      showToast('请输入回复内容', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          targetId,
          targetType,
          parentId,
          images: replyImages
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 更新评论列表中对应评论的回复
          setComments(prev => prev.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...comment.replies, data.comment],
                stats: {
                  ...comment.stats,
                  replies: comment.stats.replies + 1
                }
              }
            }
            return comment
          }))
          setReplyContent('')
          setReplyImages([])
          setReplyingTo(null)
          setShowReplyImageUpload(false)
          showToast('回复发表成功！', 'success')
        }
      } else {
        const data = await response.json()
        showToast(data.error || '发表回复失败', 'error')
      }
    } catch (error) {
      console.error('发表回复失败:', error)
      showToast('发表回复失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  const toggleReplies = (commentId: string) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  return (
    <div className="w-full mt-6">
      {/* 评论头部 */}
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              评论 ({comments.length})
            </h3>
          </div>
          
          {/* 排序选择 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">排序:</span>
            <button
              onClick={() => setSortBy('time')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                sortBy === 'time' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock size={14} className="inline mr-1" />
              时间
            </button>
            <button
              onClick={() => setSortBy('likes')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                sortBy === 'likes' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ThumbsUp size={14} className="inline mr-1" />
              热度
            </button>
          </div>
        </div>
      </div>

      {/* 评论输入框 */}
      <div className="py-4 border-b border-gray-200">
        <div className="flex space-x-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="头像" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={20} className="text-gray-500" />
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? "写下你的评论..." : "请先登录后发表评论"}
              disabled={!isAuthenticated}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            
            {/* 图片预览 */}
            {newCommentImages.length > 0 && (
              <div className="mt-3">
                <CommentImageGallery
                  images={newCommentImages}
                  onRemoveImage={(index) => {
                    setNewCommentImages(prev => prev.filter((_, i) => i !== index))
                  }}
                  editable
                />
              </div>
            )}
            
            {/* 图片上传 */}
            {showImageUpload && (
              <div className="mt-3">
                <CommentImageUpload
                  onUploadSuccess={(urls) => {
                    setNewCommentImages(prev => [...prev, ...urls])
                    setShowImageUpload(false)
                  }}
                  multiple
                  maxFiles={9 - newCommentImages.length}
                />
              </div>
            )}
            
            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  disabled={!isAuthenticated || newCommentImages.length >= 9}
                  className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                  title="添加图片"
                >
                  <ImageIcon size={16} />
                  <span className="text-sm">图片</span>
                </button>
                <span className="text-sm text-gray-500">
                  {newComment.length}/500
                </span>
              </div>
              <button
                onClick={handleSubmitComment}
                disabled={!isAuthenticated || submitting || !newComment.trim()}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
                <span>{submitting ? '发布中...' : '发布评论'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            加载评论中...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>还没有评论，来发表第一个评论吧！</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="py-4">
              {/* 评论内容 */}
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {comment.author.avatar ? (
                    <img 
                      src={comment.author.avatar} 
                      alt="头像" 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    <User size={20} className="text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-medium text-gray-900">
                      {comment.author.nickname || comment.author.username}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-3 leading-relaxed">
                    {comment.content}
                  </p>
                  
                  {/* 评论图片 */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="mb-3">
                      <CommentImageGallery images={comment.images} />
                    </div>
                  )}
                  
                  {/* 评论操作 */}
                  <div className="flex items-center space-x-4">
                    <LikeButton
                      targetId={comment.id}
                      targetType="comment"
                      size="sm"
                      initialLikeCount={comment.stats.likes}
                    />
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors text-sm"
                    >
                      <MessageCircle size={14} />
                      <span>回复</span>
                    </button>
                    {comment.stats.replies > 0 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors text-sm"
                      >
                        <span>
                          {showReplies[comment.id] ? '收起' : '展开'}
                          {comment.stats.replies}条回复
                        </span>
                      </button>
                    )}
                  </div>

                  {/* 回复输入框 */}
                  {replyingTo === comment.id && (
                    <div className="mt-4 ml-4 border-l-2 border-gray-200 pl-4">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          {user?.avatar ? (
                            <img src={user.avatar} alt="头像" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User size={16} className="text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`回复 ${comment.author.nickname || comment.author.username}...`}
                            className="w-full p-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            rows={2}
                          />
                          
                          {/* 回复图片预览 */}
                          {replyImages.length > 0 && (
                            <div className="mt-2">
                              <CommentImageGallery
                                images={replyImages}
                                onRemoveImage={(index) => {
                                  setReplyImages(prev => prev.filter((_, i) => i !== index))
                                }}
                                editable
                                size="sm"
                              />
                            </div>
                          )}
                          
                          {/* 回复图片上传 */}
                          {showReplyImageUpload && (
                            <div className="mt-2">
                              <CommentImageUpload
                                onUploadSuccess={(urls) => {
                                  setReplyImages(prev => [...prev, ...urls])
                                  setShowReplyImageUpload(false)
                                }}
                                multiple
                                maxFiles={9 - replyImages.length}
                              />
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-2">
                            <button
                              onClick={() => setShowReplyImageUpload(!showReplyImageUpload)}
                              disabled={replyImages.length >= 9}
                              className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors text-sm disabled:opacity-50"
                            >
                              <ImageIcon size={12} />
                            </button>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyContent('')
                                  setReplyImages([])
                                  setShowReplyImageUpload(false)
                                }}
                                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={submitting || !replyContent.trim()}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {submitting ? '回复中...' : '回复'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 回复列表 */}
                  {showReplies[comment.id] && comment.replies.length > 0 && (
                    <div className="mt-4 ml-4 border-l-2 border-gray-200 pl-4 space-y-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            {reply.author.avatar ? (
                              <img 
                                src={reply.author.avatar} 
                                alt="头像" 
                                className="w-full h-full rounded-full object-cover" 
                              />
                            ) : (
                              <User size={16} className="text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {reply.author.nickname || reply.author.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed mb-2">
                              {reply.content}
                            </p>
                            
                            {/* 回复图片 */}
                            {reply.images && reply.images.length > 0 && (
                              <div className="mb-2">
                                <CommentImageGallery images={reply.images} size="sm" />
                              </div>
                            )}
                            
                            <LikeButton
                              targetId={reply.id}
                              targetType="comment"
                              size="sm"
                              initialLikeCount={reply.stats.likes}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  )
} 