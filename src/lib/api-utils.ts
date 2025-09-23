// API 工具函数库 - 抽象重复逻辑
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'
import { authenticateRequest, getClientIP, logSecurityEvent } from './auth'

// 通用分页参数接口
export interface PaginationQuery {
  page: number
  limit: number
  skip: number
}

// 通用查询选项接口
export interface QueryOptions {
  category?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 通用API响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// 解析分页参数
export function parsePaginationQuery(request: NextRequest): PaginationQuery {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit
  
  return { page, limit, skip }
}

// 解析查询选项
export function parseQueryOptions(request: NextRequest): QueryOptions {
  const url = new URL(request.url)
  return {
    category: url.searchParams.get('category') || undefined,
    status: url.searchParams.get('status') || undefined,
    sortBy: url.searchParams.get('sortBy') || 'createdAt',
    sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  }
}

// 构建通用查询条件
export function buildWhereCondition(options: QueryOptions, additionalConditions?: any): any {
  const whereCondition: any = {
    deletedAt: null,
    ...additionalConditions
  }

  if (options.category && options.category !== 'all') {
    whereCondition.category = options.category
  }

  if (options.status) {
    whereCondition.status = options.status
  }

  return whereCondition
}

// 通用的分页响应构建
export function buildPaginatedResponse(
  data: any[],
  pagination: PaginationQuery,
  total: number,
  dataKey: string
) {
  return {
    success: true,
    [dataKey]: data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit)
    }
  }
}

// 通用的 Prisma 查询执行器
export class BaseApiService {
  // 通用获取列表方法
  static async getList<T>(
    model: any, // Prisma model
    request: NextRequest,
    options: {
      include?: any
      additionalWhere?: any
      defaultStatus?: string
      dataKey: string
      parseImages?: boolean
      parseTags?: boolean
    }
  ) {
    const pagination = parsePaginationQuery(request)
    const queryOptions = parseQueryOptions(request)
    
    // 构建 where 条件
    const whereCondition = buildWhereCondition(
      queryOptions,
      options.additionalWhere || (options.defaultStatus ? { status: options.defaultStatus } : {})
    )

    // 获取数据
    const [items, total] = await Promise.all([
      model.findMany({
        where: whereCondition,
        include: options.include,
        orderBy: {
          [queryOptions.sortBy!]: queryOptions.sortOrder
        },
        skip: pagination.skip,
        take: pagination.limit
      }),
      model.count({ where: whereCondition })
    ])

    // 处理 JSON 字段
    let formattedItems = items
    if (options.parseImages || options.parseTags) {
      formattedItems = items.map((item: any) => ({
        ...item,
        ...(options.parseImages && item.images ? { images: JSON.parse(item.images) } : {}),
        ...(options.parseTags && item.tags ? { tags: JSON.parse(item.tags) } : {})
      }))
    }

    return buildPaginatedResponse(formattedItems, pagination, total, options.dataKey)
  }
}

// JSON 字段处理工具
export function parseJsonFields(item: any, fields: string[]): any {
  const result = { ...item }
  fields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field])
      } catch (error) {
        console.warn(`Failed to parse JSON field ${field}:`, error)
        result[field] = []
      }
    }
  })
  return result
}

// 错误响应构建器
export function buildErrorResponse(message: string, status: number = 500) {
  return {
    error: message
  }
}

// 成功响应构建器
export function buildSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    ...(message && { message }),
    ...(data && { data })
  }
}

// 通用错误处理
export function handleApiError(error: any, context: string, clientIP?: string): NextResponse {
  console.error(`${context} - 错误:`, error)
  
  if (clientIP) {
    logSecurityEvent('API_ERROR', { 
      context,
      error: error instanceof Error ? error.message : 'unknown' 
    }, clientIP)
  }
  
  return NextResponse.json(
    { success: false, error: '操作失败，请重试' },
    { status: 500 }
  )
}

// 认证中间件
export function withAuth(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const clientIP = getClientIP(request)
      const { isAuthenticated, user } = authenticateRequest(request)
      
      if (!isAuthenticated || !user) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', { endpoint: request.url }, clientIP)
        return NextResponse.json(
          { success: false, error: '请先登录' },
          { status: 401 }
        )
      }
      
      return await handler(request, user)
    } catch (error) {
      return handleApiError(error, 'Auth Middleware', getClientIP(request))
    }
  }
}

// 通用分页查询
export async function paginatedQuery<T>(
  model: any,
  options: {
    where?: any
    include?: any
    orderBy?: any
    page?: number
    limit?: number
    select?: any
  }
): Promise<{
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}> {
  const { where, include, orderBy, select, page = 1, limit = 10 } = options
  const skip = (page - 1) * limit
  
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      orderBy,
      skip,
      take: limit
    }),
    model.count({ where })
  ])
  
  const pages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages
    }
  }
}

// 通用CRUD操作生成器
export function createCRUDHandlers<T>(
  modelName: string,
  options: {
    // 查询配置
    listInclude?: any
    listSelect?: any
    detailInclude?: any
    detailSelect?: any
    defaultOrderBy?: any
    
    // 权限配置
    requireAuth?: {
      list?: boolean
      detail?: boolean
      create?: boolean
      update?: boolean
      delete?: boolean
    }
    
    // 验证配置
    validateCreate?: (data: any) => { isValid: boolean; message?: string }
    validateUpdate?: (data: any) => { isValid: boolean; message?: string }
    
    // 处理器钩子
    beforeCreate?: (data: any, user?: any) => any
    afterCreate?: (data: any, user?: any) => void
    beforeUpdate?: (data: any, user?: any) => any
    afterUpdate?: (data: any, user?: any) => void
    beforeDelete?: (id: string, user?: any) => void
    afterDelete?: (id: string, user?: any) => void
  } = {}
) {
  const model = (prisma as any)[modelName]
  if (!model) {
    throw new Error(`Model ${modelName} not found`)
  }
  
  const {
    listInclude,
    listSelect,
    detailInclude,
    detailSelect,
    defaultOrderBy = { createdAt: 'desc' },
    requireAuth = {},
    validateCreate,
    validateUpdate,
    beforeCreate,
    afterCreate,
    beforeUpdate,
    afterUpdate,
    beforeDelete,
    afterDelete
  } = options
  
  // GET 列表
  const handleList = async (request: NextRequest): Promise<NextResponse> => {
    try {
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)
      const category = url.searchParams.get('category')
      
      // 构建查询条件
      const where: any = {}
      if (category && category !== 'all') {
        where.category = category
      }
      
      const result = await paginatedQuery(model, {
        where,
        include: listInclude,
        select: listSelect,
        orderBy: defaultOrderBy,
        page,
        limit
      })
      
      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      })
    } catch (error) {
      return handleApiError(error, `${modelName} List`, getClientIP(request))
    }
  }
  
  // GET 详情
  const handleDetail = async (request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> => {
    try {
      const item = await model.findUnique({
        where: { id: params.id },
        include: detailInclude,
        select: detailSelect
      })
      
      if (!item) {
        return NextResponse.json(
          { success: false, error: '内容不存在' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: item
      })
    } catch (error) {
      return handleApiError(error, `${modelName} Detail`, getClientIP(request))
    }
  }
  
  // POST 创建
  const handleCreate = async (request: NextRequest, user?: any): Promise<NextResponse> => {
    try {
      const data = await request.json()
      
      // 验证数据
      if (validateCreate) {
        const validation = validateCreate(data)
        if (!validation.isValid) {
          return NextResponse.json(
            { success: false, error: validation.message },
            { status: 400 }
          )
        }
      }
      
      // 预处理数据
      let processedData = data
      if (beforeCreate) {
        processedData = beforeCreate(data, user)
      }
      
      // 创建记录
      const item = await model.create({
        data: processedData,
        include: detailInclude
      })
      
      // 后处理
      if (afterCreate) {
        afterCreate(item, user)
      }
      
      return NextResponse.json({
        success: true,
        data: item,
        message: '创建成功'
      })
    } catch (error) {
      return handleApiError(error, `${modelName} Create`, getClientIP(request))
    }
  }
  
  return {
    handleList: requireAuth.list ? withAuth((req, user) => handleList(req)) : handleList,
    handleDetail: requireAuth.detail ? withAuth((req, user) => handleDetail(req, { params: { id: '' } })) : handleDetail,
    handleCreate: requireAuth.create ? withAuth(handleCreate) : (req: NextRequest) => handleCreate(req),
    // 可以继续添加 UPDATE 和 DELETE handlers
  }
}

// 统一的数据转换工具
export function transformForFeed(items: any[], type: 'post' | 'confession' | 'market' | 'task') {
  return items.map(item => ({
    id: item.id,
    type,
    title: item.title || '',
    content: item.content || item.description || '',
    images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
    author: {
      id: item.author?.id || item.seller?.id || item.publisher?.id,
      username: item.author?.username || item.seller?.username || item.publisher?.username,
      nickname: item.author?.nickname || item.seller?.nickname || item.publisher?.nickname,
      avatar: item.author?.avatar || item.seller?.avatar || item.publisher?.avatar
    },
    createdAt: item.createdAt,
    isAnonymous: item.isAnonymous || false,
    category: item.category,
    tags: typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : (item.tags || []),
    price: item.price,
    reward: item.reward,
    condition: item.condition,
    location: item.location,
    deadline: item.deadline,
    stats: {
      likes: item._count?.likes || 0,
      comments: item._count?.comments || 0,
      views: item.viewCount || 0
    }
  }))
}

// 通用状态枚举转换
export const STATUS_MAPPINGS = {
  marketItem: {
    AVAILABLE: '在售',
    SOLD: '已售出',
    RESERVED: '已预订'
  },
  task: {
    OPEN: '招募中',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  },
  condition: {
    NEW: '全新',
    EXCELLENT: '近新',
    GOOD: '良好',
    FAIR: '一般',
    POOR: '较差'
  }
}

// 状态颜色映射
export const STATUS_COLORS = {
  marketItem: {
    AVAILABLE: 'bg-green-100 text-green-800',
    SOLD: 'bg-gray-100 text-gray-800',
    RESERVED: 'bg-yellow-100 text-yellow-800'
  },
  task: {
    OPEN: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800'
  },
  condition: {
    NEW: 'bg-green-100 text-green-800',
    EXCELLENT: 'bg-blue-100 text-blue-800',
    GOOD: 'bg-yellow-100 text-yellow-800',
    FAIR: 'bg-orange-100 text-orange-800',
    POOR: 'bg-red-100 text-red-800'
  }
} 