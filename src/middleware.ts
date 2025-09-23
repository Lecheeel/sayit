import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenBasic } from '@/lib/auth-edge'

// 需要登录才能访问的路径（写权限）
const protectedPaths = [
  '/confessions/create',
  '/posts/create', 
  '/market/create',
  '/tasks/create',
  '/dashboard',
  '/profile',
  '/admin'
]

// 需要登录才能访问的 API 路径（写操作）
const protectedApiPaths = [
  '/api/confessions/create',
  '/api/posts/create',
  '/api/market/create', 
  '/api/tasks/create',
  '/api/comments/create',
  '/api/likes/toggle'
]

// 仅登录用户不能访问的路径（如登录、注册页面）
const guestOnlyPaths = [
  '/login',
  '/register'
]

// 跳过中间件检查的路径
const skipAuthPaths = [
  '/api/auth/refresh', // token刷新端点
  '/api/auth/login',   // 登录端点
  '/api/auth/register', // 注册端点
  '/api/captcha',      // 验证码端点
  '/api/hcaptcha'      // hCaptcha端点
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 跳过特定路径的认证检查
  if (skipAuthPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  const token = request.cookies.get('auth-token')?.value
  const refreshToken = request.cookies.get('refresh-token')?.value

  // 只在开发环境或出现问题时记录详细日志
  const isDebug = process.env.NODE_ENV === 'development'
  if (isDebug && (pathname.startsWith('/api/') || !token)) {
    console.log('中间件检查:', pathname, '- Token存在:', !!token, '- RefreshToken存在:', !!refreshToken)
  }

  // 检查是否为受保护的路径
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isProtectedApiPath = protectedApiPaths.some(path => pathname.startsWith(path))
  const isGuestOnlyPath = guestOnlyPaths.some(path => pathname.startsWith(path))

  // 如果是受保护的路径但没有token，重定向到登录页
  if ((isProtectedPath || isProtectedApiPath) && !token) {
    if (isDebug) {
      console.log('中间件: 没有访问token，阻止访问受保护路径')
    }
    if (isProtectedApiPath) {
      // API 路径返回 401 未授权
      return new NextResponse(
        JSON.stringify({ error: '请先登录', needsAuth: true }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 如果有token，进行基础验证（Edge Runtime兼容）
  if (token) {
    try {
      const verification = verifyTokenBasic(token, request)
      
      if (!verification.isValid) {
        if (isDebug) {
          console.log('中间件: Token验证失败 -', verification.error)
        }
        
        // 对于guest-only路径，清除无效token并允许访问
        if (isGuestOnlyPath) {
          const response = NextResponse.next()
          response.cookies.set('auth-token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/'
          })
          response.cookies.set('refresh-token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/'
          })
          return response
        }
        
        // 如果token过期但应该刷新，引导前端进行token刷新
        if (verification.shouldRefresh && refreshToken) {
          if (isProtectedApiPath) {
            return new NextResponse(
              JSON.stringify({ 
                error: 'Token已过期', 
                needsRefresh: true,
                refreshEndpoint: '/api/auth/refresh'
              }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          } else {
            // 对于页面请求，重定向到登录页
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirect', pathname)
            loginUrl.searchParams.set('expired', 'true')
            return NextResponse.redirect(loginUrl)
          }
        }
        
        // 其他验证失败情况，清除token并重定向到登录页
        if (isProtectedPath || isProtectedApiPath) {
          if (isProtectedApiPath) {
            return new NextResponse(
              JSON.stringify({ error: verification.error || '认证失败', needsAuth: true }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('redirect', pathname)
          return NextResponse.redirect(loginUrl)
        }
      } else {
        // Token验证成功
        if (isDebug && (isProtectedPath || isProtectedApiPath)) {
          console.log('中间件: Token验证成功 - 用户:', verification.payload?.username)
        }
        
        // 对于guest-only路径，重定向已登录用户到首页
        if (isGuestOnlyPath) {
          if (isDebug) {
            console.log('中间件: 检测到已登录用户访问客人页面，重定向到首页')
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
        
        // 如果token需要刷新，设置响应头提示前端
        if (verification.shouldRefresh) {
          const response = NextResponse.next()
          response.headers.set('X-Token-Refresh-Needed', 'true')
          return response
        }
      }
    } catch (error) {
      console.error('中间件: Token验证过程中发生错误:', error)
      
      // 验证过程出错，清除token
      const response = isGuestOnlyPath ? NextResponse.next() : 
        NextResponse.redirect(new URL('/login', request.url))
        
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      response.cookies.set('refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }
  } else if (isGuestOnlyPath && refreshToken) {
    // 没有访问token但有刷新token，可能需要刷新
    if (isDebug) {
      console.log('中间件: 检测到仅有刷新token，可能需要刷新访问token')
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 匹配所有路径，除了静态资源
    '/((?!_next/static|_next/image|favicon.ico|uploads|api/static).*)',
  ],
} 