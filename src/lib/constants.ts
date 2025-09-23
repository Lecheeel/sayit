// 全局常量定义 - 统一管理重复的常量
export const CATEGORIES = {
  // 帖子分类
  POST: [
    { id: 'all', name: '全部' },
    { id: 'study', name: '学习' },
    { id: 'life', name: '生活' },
    { id: 'entertainment', name: '娱乐' },
    { id: 'sports', name: '运动' },
    { id: 'food', name: '美食' },
    { id: 'other', name: '其他' }
  ],
  
  // 商品分类
  MARKET: [
    { id: 'all', name: '全部' },
    { id: 'books', name: '教材书籍' },
    { id: 'electronics', name: '数码电子' },
    { id: 'clothes', name: '服装配饰' },
    { id: 'daily', name: '生活用品' },
    { id: 'sports', name: '运动用品' },
    { id: 'other', name: '其他' }
  ],
  
  // 任务分类
  TASK: [
    { id: 'all', name: '全部' },
    { id: 'study', name: '学习辅导' },
    { id: 'delivery', name: '代拿快递' },
    { id: 'proxy', name: '代买代办' },
    { id: 'tech', name: '技术帮助' },
    { id: 'other', name: '其他' }
  ]
} as const

// 有效分类数组（用于验证）
export const VALID_CATEGORIES = {
  POST: ['study', 'life', 'entertainment', 'sports', 'food', 'other'],
  MARKET: ['books', 'electronics', 'clothes', 'daily', 'sports', 'other'],
  TASK: ['study', 'delivery', 'proxy', 'tech', 'other']
} as const

// 状态定义
export const STATUS = {
  // 商品状态
  MARKET_ITEM: {
    AVAILABLE: 'AVAILABLE',
    SOLD: 'SOLD',
    RESERVED: 'RESERVED'
  },
  
  // 任务状态
  TASK: {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
  },
  
  // 表白/帖子状态
  CONTENT: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
  }
} as const

// 商品状况
export const MARKET_CONDITIONS = {
  NEW: 'NEW',
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR'
} as const

// 状态标签映射
export const STATUS_LABELS = {
  // 商品状态标签
  MARKET_ITEM: {
    [STATUS.MARKET_ITEM.AVAILABLE]: '可购买',
    [STATUS.MARKET_ITEM.SOLD]: '已售出',
    [STATUS.MARKET_ITEM.RESERVED]: '已预订'
  },
  
  // 任务状态标签
  TASK: {
    [STATUS.TASK.OPEN]: '进行中',
    [STATUS.TASK.IN_PROGRESS]: '执行中',
    [STATUS.TASK.COMPLETED]: '已完成',
    [STATUS.TASK.CANCELLED]: '已取消'
  },
  
  // 商品状况标签
  CONDITION: {
    [MARKET_CONDITIONS.NEW]: '全新',
    [MARKET_CONDITIONS.EXCELLENT]: '极好',
    [MARKET_CONDITIONS.GOOD]: '良好',
    [MARKET_CONDITIONS.FAIR]: '一般',
    [MARKET_CONDITIONS.POOR]: '较差'
  }
} as const

// 分页配置
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  MIN_LIMIT: 1
} as const

// 文件上传配置
export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_COUNT: 9,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
} as const

// 内容限制
export const CONTENT_LIMITS = {
  POST: {
    TITLE_MAX: 100,
    CONTENT_MAX: 5000,
    TAGS_MAX: 10,
    TAG_LENGTH_MAX: 20
  },
  CONFESSION: {
    CONTENT_MAX: 1000
  },
  MARKET: {
    TITLE_MAX: 100,
    DESCRIPTION_MAX: 2000,
    LOCATION_MAX: 100
  },
  TASK: {
    TITLE_MAX: 100,
    DESCRIPTION_MAX: 3000
  },
  COMMENT: {
    CONTENT_MAX: 500
  }
} as const

// 用户角色
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR'
} as const

// 主题色配置
export const THEME_COLORS = {
  POST: {
    PRIMARY: 'blue-500',
    SECONDARY: 'blue-100',
    TEXT: 'blue-700',
    GRADIENT: 'from-blue-50 to-indigo-50'
  },
  CONFESSION: {
    PRIMARY: 'pink-500',
    SECONDARY: 'pink-100',
    TEXT: 'pink-700',
    GRADIENT: 'from-pink-50 to-red-50'
  },
  MARKET: {
    PRIMARY: 'green-500',
    SECONDARY: 'green-100',
    TEXT: 'green-700',
    GRADIENT: 'from-green-50 to-emerald-50'
  },
  TASK: {
    PRIMARY: 'yellow-500',
    SECONDARY: 'yellow-100',
    TEXT: 'yellow-700',
    GRADIENT: 'from-yellow-50 to-orange-50'
  }
} as const

// API 端点
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify'
  },
  POSTS: {
    LIST: '/api/posts',
    CREATE: '/api/posts/create',
    DETAIL: '/api/posts',
    UPDATE: '/api/posts',
    DELETE: '/api/posts'
  },
  CONFESSIONS: {
    LIST: '/api/confessions',
    CREATE: '/api/confessions/create',
    DETAIL: '/api/confessions',
    UPDATE: '/api/confessions',
    DELETE: '/api/confessions'
  },
  MARKET: {
    LIST: '/api/market',
    CREATE: '/api/market/create',
    DETAIL: '/api/market',
    UPDATE: '/api/market',
    DELETE: '/api/market'
  },
  TASKS: {
    LIST: '/api/tasks',
    CREATE: '/api/tasks/create',
    DETAIL: '/api/tasks',
    UPDATE: '/api/tasks',
    DELETE: '/api/tasks'
  },
  COMMENTS: '/api/comments',
  LIKES: '/api/likes',
  UPLOAD: '/api/upload',
  SEARCH: '/api/search'
} as const

// 验证规则
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 16,
    MAX_DISPLAY_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_\u4e00-\u9fa5\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  STUDENT_ID: {
    PATTERN: /^\d{8,12}$/
  },
  PRICE: {
    MIN: 0.01,
    MAX: 99999.99
  }
} as const

// 时间相关常量
export const TIME = {
  MILLISECONDS: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
  },
  JWT_EXPIRES_IN: '7d',
  MAX_TASK_DEADLINE: 365 // 天
} as const

// 错误消息
export const ERROR_MESSAGES = {
  AUTH: {
    UNAUTHORIZED: '请先登录',
    INVALID_CREDENTIALS: '用户名或密码错误',
    USER_EXISTS: '用户已存在',
    WEAK_PASSWORD: '密码过于简单',
    INVALID_EMAIL: '邮箱格式不正确'
  },
  VALIDATION: {
    REQUIRED: '该字段是必填的',
    TOO_LONG: '内容过长',
    TOO_SHORT: '内容过短',
    INVALID_FORMAT: '格式不正确',
    INVALID_CATEGORY: '分类无效',
    INVALID_PRICE: '价格无效',
    TOO_MANY_IMAGES: '图片数量过多',
    FILE_TOO_LARGE: '文件过大'
  },
  NETWORK: {
    TIMEOUT: '请求超时',
    CONNECTION_ERROR: '网络连接错误',
    SERVER_ERROR: '服务器错误'
  }
} as const

// 工具函数 - 获取有效分类数组
export function getValidCategories(type: keyof typeof VALID_CATEGORIES): readonly string[] {
  return VALID_CATEGORIES[type]
}

// 工具函数 - 获取分类选项
export function getCategoryOptions(type: keyof typeof CATEGORIES) {
  return CATEGORIES[type]
}

// 工具函数 - 获取状态标签
export function getStatusLabel(type: keyof typeof STATUS_LABELS, status: string): string {
  return STATUS_LABELS[type][status as keyof typeof STATUS_LABELS[typeof type]] || status
}

// 工具函数 - 获取主题色
export function getThemeColors(type: keyof typeof THEME_COLORS) {
  return THEME_COLORS[type]
} 