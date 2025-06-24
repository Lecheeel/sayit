# SayIt 校园社交平台

一个基于 Next.js 的现代化校园社交平台，包含表白墙、校园圈、市场、悬赏任务等功能。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
创建 `.env.local` 文件并配置以下环境变量：
```
# JWT 密钥
JWT_SECRET=your-super-secret-key-here

# HCaptcha (可选，用于人机验证)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-hcaptcha-site-key
HCAPTCHA_SECRET_KEY=your-hcaptcha-secret-key
```

### 3. 数据库初始化
```bash
# 方法一：使用一键设置命令
npm run setup

# 方法二：分步执行
npm run db:push      # 创建数据库表
npm run db:generate  # 生成 Prisma Client
node scripts/init-db.js  # 初始化示例数据
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔐 默认账号

初始化完成后，系统会创建一个默认管理员账号：
- **用户名**: `admin`
- **密码**: `admin123`

## 📦 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run db:push` - 推送数据库架构更改
- `npm run db:generate` - 生成 Prisma Client
- `npm run db:init` - 初始化数据库和示例数据
- `npm run db:studio` - 启动 Prisma Studio 数据库管理界面
- `npm run setup` - 一键安装和初始化

## 🏗️ 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite + Prisma ORM
- **认证**: JWT
- **文件上传**: 本地存储
- **UI组件**: Radix UI + Lucide Icons

## 📁 项目结构

```
src/
├── app/              # Next.js App Router 页面
├── components/       # React 组件
├── lib/             # 工具函数和配置
├── types/           # TypeScript 类型定义
└── middleware.ts    # Next.js 中间件

prisma/
├── schema.prisma    # 数据库模式
└── dev.db          # SQLite 数据库文件

scripts/
└── init-db.js      # 数据库初始化脚本
```

## 🎯 主要功能

- **表白墙**: 匿名或实名发表表白内容
- **校园圈**: 校园生活分享和讨论
- **校园市场**: 二手物品交易
- **悬赏任务**: 发布和接取任务
- **用户系统**: 注册、登录、个人资料
- **互动功能**: 点赞、评论、浏览统计
- **图片上传**: 支持多图片上传和查看

## 🔧 开发说明

### 数据库管理
```bash
# 查看和编辑数据库
npm run db:studio

# 重置数据库（删除所有数据）
rm prisma/dev.db
npm run db:init
```

### 新用户首次使用
如果是第一次运行项目，请务必执行：
```bash
npm run setup
```

这个命令会：
1. 安装所有依赖
2. 创建数据库表结构
3. 生成 Prisma Client
4. 创建默认管理员账号

## �� 许可证

MIT License 