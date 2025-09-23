// 用户相关类型
export interface User {
  id: string
  email?: string
  username: string
  avatar?: string
  nickname?: string
  studentId?: string
  school?: string
  major?: string
  grade?: string
  isVerified: boolean
  role: 'STUDENT' | 'ADMIN' | 'MODERATOR'
  createdAt: Date
  updatedAt: Date
}

// 表白墙相关类型
export interface Confession {
  id: string
  content: string
  images: string[]
  isAnonymous: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  authorId: string
  author: User
  createdAt: Date
  updatedAt: Date
  _count?: {
    likes: number
    comments: number
  }
}

// 帖子相关类型
export interface Post {
  id: string
  title: string
  content: string
  images: string[]
  category?: string
  tags: string[]
  authorId: string
  author: User
  createdAt: Date
  updatedAt: Date
  _count?: {
    likes: number
    comments: number
  }
}

// 评论相关类型
export interface Comment {
  id: string
  content: string
  authorId: string
  author: User
  postId?: string
  confessionId?: string
  parentId?: string
  createdAt: Date
  updatedAt: Date
  replies?: Comment[]
  _count?: {
    likes: number
    replies: number
  }
}

// 市场商品相关类型
export interface MarketItem {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  category: string
  condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED'
  sellerId: string
  seller: User
  buyerId?: string
  location?: string
  createdAt: Date
  updatedAt: Date
}

// 任务相关类型
export interface Task {
  id: string
  title: string
  description: string
  reward: number
  category: string
  deadline?: Date
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  publisherId: string
  publisher: User
  acceptorId?: string
  acceptor?: User
  createdAt: Date
  updatedAt: Date
  _count?: {
    applications: number
  }
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页参数类型
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// 信息流项目类型
export interface FeedItem {
  id: string
  type: 'confession' | 'post' | 'market' | 'task'
  title: string
  content: string
  images?: string[]
  author: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
  createdAt: string
  // 表白墙和帖子的统计数据
  stats?: {
    likes: number
    comments: number
  }
  // 帖子相关
  category?: string
  tags?: string[]
  // 商品相关
  price?: number
  condition?: string
  location?: string
  // 任务相关
  reward?: number
  deadline?: string
  // 匿名相关
  isAnonymous?: boolean
}

// 分页信息类型
export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

// 信息流 API 响应类型
export interface FeedResponse {
  success: boolean
  items: FeedItem[]
  pagination: Pagination
}

// 搜索相关类型
export interface SearchParams {
  query: string
  sortBy?: 'createdAt' | 'likes' | 'comments' | 'views'
  sortOrder?: 'asc' | 'desc'
  timeRange?: 'all' | '7d' | '30d' | '1y' | 'custom'
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface SearchResult {
  id: string
  type: 'confession' | 'post' | 'market' | 'task'
  title: string
  content: string
  highlightedTitle?: string // 高亮标题
  highlightedContent?: string // 高亮内容
  matchIn: ('title' | 'content')[] // 匹配位置
  images?: string[]
  author: {
    id: string
    username: string
    nickname?: string
    avatar?: string
  }
  createdAt: string
  stats?: {
    likes: number
    comments: number
    views?: number
  }
  // 帖子相关
  category?: string
  tags?: string[]
  // 商品相关
  price?: number
  condition?: string
  location?: string
  status?: string
  // 任务相关
  reward?: number
  deadline?: string
  taskStatus?: string
  // 匿名相关
  isAnonymous?: boolean
}

export interface SearchResponse {
  success: boolean
  results: SearchResult[]
  pagination: Pagination
  query: string
  totalResults: number
} 