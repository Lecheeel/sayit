'use client'

// 重构后的 Posts 页面 - 使用通用组件和钩子
import { MessageCircle } from 'lucide-react'
import PageLayout, { createPageConfig } from '@/components/PageLayout'
import { usePostsData } from '@/lib/usePageData'
import { FeedItem } from '@/components/FeedList'
import { CATEGORIES, THEME_COLORS, getCategoryOptions } from '@/lib/constants'

// 类型定义（从原有类型中继承）
interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

interface Post {
  id: string
  title: string
  content: string
  images: string[]
  category?: string
  tags: string[]
  createdAt: string
  author: User
  _count: {
    likes: number
    comments: number
  }
}

export default function PostsPageRefactored() {
  // 使用通用数据钩子
  const usePageData = () => usePostsData()

  // 页面配置
  const config = createPageConfig({
    title: '校园圈',
    subtitle: '分享校园生活，互动交流',
    icon: <MessageCircle className="mr-2 text-blue-500" />,
    buttonText: '发布帖子',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
    bgGradient: `bg-gradient-to-br ${THEME_COLORS.POST.GRADIENT}`,
    categories: getCategoryOptions('POST') as any,
    layoutMode: 'masonry',
    showContent: true,
    useInfiniteScroll: false,
    createType: 'post',
    apiEndpoint: '/api/posts',
    emptyMessage: '成为第一个发布帖子的人吧！'
  })

  // 数据转换函数
  const convertToFeedItems = (posts: Post[]): FeedItem[] => {
    return posts.map(post => ({
      id: post.id,
      type: 'post' as const,
      title: post.title,
      content: post.content,
      images: post.images,
      author: {
        id: post.author.id,
        username: post.author.username,
        nickname: post.author.nickname,
        avatar: post.author.avatar
      },
      createdAt: post.createdAt,
      category: post.category,
      tags: post.tags,
      stats: {
        likes: post._count.likes,
        comments: post._count.comments
      }
    }))
  }

  return (
    <PageLayout
      config={config}
      usePageData={usePageData}
      convertToFeedItems={convertToFeedItems}
    />
  )
} 