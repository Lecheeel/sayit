import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 移除不安全的忽略配置，应该修复而不是忽略错误
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  
  // 添加安全头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // 配置图片优化（可选）
  images: {
    unoptimized: false, // 如果不需要图片优化，可以设置为true
    domains: [], // 添加允许的外部图片域名
    formats: ['image/webp', 'image/avif'],
  },
  
  // 添加静态文件服务配置
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/static/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
