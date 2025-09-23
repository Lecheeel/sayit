# 🎓 SayIt - 现代化校园社交平台

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.10-green)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC)](https://tailwindcss.com/)

> 一个专为大学生设计的全功能校园社交平台，连接校园生活的每一个精彩瞬间

## ✨ 项目简介

SayIt 是一个现代化的校园社交平台，旨在为大学生提供一个便捷、安全、有趣的数字化交流空间。通过集成表白墙、校园圈、跳蚤市场和悬赏任务等功能模块，让校园生活更加丰富多彩。

### 🎯 核心特色

- **💝 表白墙** - 匿名表白功能，传递校园爱意
- **🎪 校园圈** - 分享校园生活点滴，互动交流
- **🛒 跳蚤市场** - 二手物品交易，绿色环保
- **🎯 悬赏任务** - 发布和接收各类校园任务
- **🔍 智能搜索** - 全站内容搜索，快速找到所需
- **👤 完整用户系统** - 注册、登录、个人资料管理

### 🛠️ 技术亮点

- **现代化架构** - 基于 Next.js 15 + React 19 构建
- **类型安全** - 全面使用 TypeScript 开发
- **响应式设计** - 完美适配移动端和桌面端
- **性能优化** - 瀑布流布局、懒加载、图片压缩
- **数据安全** - JWT 认证 + 数据加密存储
- **实时交互** - 流畅的用户体验和实时反馈

## 🚀 快速开始

### 环境要求

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/your-username/sayit.git
cd sayit

# 2. 一键安装与初始化
npm run setup

# 3. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用

### 🔐 默认账户

初始化完成后，系统会创建一个默认管理员账户且密码为随机强密码：

```
用户名: admin
密码: [随机强密码，将在初始化日志中输出，并保存到 admin_credentials.txt]
```

### 环境变量配置

创建 `.env.local` 文件：

```bash
# JWT 认证密钥（必填）
JWT_SECRET=your-super-secret-key-here

# HCaptcha 人机验证（可选）
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-hcaptcha-site-key
HCAPTCHA_SECRET_KEY=your-hcaptcha-secret-key
```

## 📁 项目结构

```
sayit/
├── src/
│   ├── app/                     # Next.js App Router 页面
│   │   ├── api/                 # API 路由
│   │   │   ├── auth/           # 用户认证
│   │   │   ├── confessions/    # 表白墙
│   │   │   ├── posts/          # 校园圈
│   │   │   ├── market/         # 跳蚤市场
│   │   │   ├── tasks/          # 悬赏任务
│   │   │   └── ...
│   │   ├── confessions/        # 表白墙页面
│   │   ├── posts/              # 校园圈页面
│   │   ├── market/             # 跳蚤市场页面
│   │   ├── tasks/              # 悬赏任务页面
│   │   └── search/             # 搜索页面
│   ├── components/             # React 组件
│   │   ├── ui/                 # 基础 UI 组件
│   │   ├── FeedCard.tsx        # 信息流卡片
│   │   ├── FeedList.tsx        # 信息流列表
│   │   ├── CreatePostDialog.tsx # 创建内容弹窗
│   │   └── ...
│   ├── lib/                    # 工具函数和 Hooks
│   │   ├── auth.ts            # 认证逻辑
│   │   ├── prisma.ts          # 数据库连接
│   │   ├── constants.ts       # 常量定义
│   │   └── ...
│   ├── types/                  # TypeScript 类型定义
│   └── middleware.ts           # Next.js 中间件
├── prisma/                     # 数据库配置
│   ├── schema.prisma          # 数据模型
│   └── dev.db                 # SQLite 数据库
├── public/                     # 静态资源
├── scripts/                    # 工具脚本
└── ...
```

## 🎯 功能模块

### 1. 表白墙 💝
- **匿名发布** - 支持匿名或实名表白
- **图片上传** - 最多 9 张图片
- **瀑布流布局** - 美观的双列布局
- **互动功能** - 点赞、评论、浏览统计

### 2. 校园圈 🎪
- **分类管理** - 学习、生活、娱乐等分类
- **标签系统** - 自定义标签标记
- **多图展示** - 2x2 网格布局优化
- **搜索高亮** - 智能搜索结果高亮

### 3. 跳蚤市场 🛒
- **商品管理** - 发布、编辑、删除商品
- **状态跟踪** - 可售、已售、预订状态
- **条件筛选** - 价格、品相、分类筛选
- **位置信息** - 交易地点标记

### 4. 悬赏任务 🎯
- **任务发布** - 设置奖励和截止时间
- **申请系统** - 任务申请和接收流程
- **状态管理** - 开放、进行中、已完成
- **分类筛选** - 学习、代办、技术等分类

### 5. 搜索系统 🔍
- **全站搜索** - 跨模块内容搜索
- **高级筛选** - 时间、分类、排序筛选
- **结果高亮** - 关键词高亮显示
- **搜索历史** - 智能搜索建议

## 🛠️ 技术栈

### 前端技术
- **[Next.js 15](https://nextjs.org/)** - React 全栈框架
- **[React 19](https://reactjs.org/)** - 用户界面库
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - 原子化 CSS 框架
- **[Lucide React](https://lucide.dev/)** - 现代图标库
- **[Radix UI](https://www.radix-ui.com/)** - 无障碍 UI 组件

### 后端技术
- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - 服务端 API
- **[Prisma](https://www.prisma.io/)** - 现代数据库 ORM
- **[SQLite](https://www.sqlite.org/)** - 轻量级数据库
- **[JWT](https://jwt.io/)** - 用户认证
- **[bcryptjs](https://www.npmjs.com/package/bcryptjs)** - 密码加密

### 开发工具
- **[ESLint](https://eslint.org/)** - 代码规范检查
- **[PostCSS](https://postcss.org/)** - CSS 处理器
- **[Turbopack](https://turbo.build/pack)** - 快速构建工具

## 🗄️ 数据模型

### 核心数据表
- **users** - 用户信息
- **confessions** - 表白墙内容
- **posts** - 校园圈帖子
- **market_items** - 跳蚤市场商品
- **tasks** - 悬赏任务
- **comments** - 评论系统
- **likes** - 点赞记录
- **view_records** - 浏览记录

### 数据关系
- 用户与内容的多对多关系
- 层级评论系统支持
- 完整的点赞和浏览统计

## 📜 可用脚本

```bash
# 开发
npm run dev                    # 启动开发服务器
npm run dev:3000              # 指定端口 3000 启动

# 构建
npm run build                 # 构建生产版本
npm run start                 # 启动生产服务器

# 数据库
npm run db:push               # 推送数据库架构
npm run db:generate           # 生成 Prisma Client
npm run db:init               # 初始化数据库和示例数据
npm run db:studio             # 启动数据库管理界面
npm run db:reset              # 重置数据库

# 其他
npm run lint                  # 代码规范检查
npm run setup                 # 一键安装和初始化
```

## 🎨 界面设计

### 响应式布局
- **移动端优先** - 完美适配手机和平板
- **瀑布流布局** - 美观的双列/多列布局
- **智能导航** - 滚动时自动隐藏/显示

### 交互体验
- **无限滚动** - 流畅的内容加载
- **图片画廊** - 支持多图浏览和缩放
- **实时反馈** - 即时的操作反馈
- **Toast 通知** - 优雅的消息提示

### 主题配色
- **表白墙** - 粉色主题，温馨浪漫
- **校园圈** - 蓝色主题，活泼友好
- **跳蚤市场** - 绿色主题，清新自然
- **悬赏任务** - 黄色主题，醒目活力

## 🔐 安全特性

### 用户认证
- **JWT Token** - 安全的用户会话管理
- **密码加密** - bcrypt 密码哈希存储
- **角色权限** - 学生、管理员、版主权限控制

### 数据安全
- **输入验证** - 严格的输入数据验证
- **XSS 防护** - 防止跨站脚本攻击
- **文件上传** - 安全的图片上传处理
- **敏感信息** - 环境变量安全管理

## 🚀 性能优化

### 前端优化
- **代码分割** - 按需加载减少首屏时间
- **图片优化** - 自动压缩和格式转换
- **懒加载** - 图片和组件按需加载
- **缓存策略** - 智能缓存提升体验

### 后端优化
- **数据库索引** - 优化查询性能
- **分页查询** - 减少数据传输量
- **并发处理** - 高效的数据库连接池
- **错误处理** - 完善的错误处理机制

## 🧪 开发指南

### 本地开发
```bash
# 开发环境热重载
npm run dev

# 查看数据库
npm run db:studio

# 重置开发数据
npm run db:reset
```

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件使用 React Hooks 模式
- 样式使用 Tailwind CSS 原子类

### 贡献指南
1. Fork 本项目
2. 创建功能分支
3. 提交代码修改
4. 创建 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

## 🤝 联系我们

- 提交 Issue：[GitHub Issues](https://github.com/your-username/sayit/issues)
- 功能建议：[GitHub Discussions](https://github.com/your-username/sayit/discussions)
- 邮件联系：your-email@example.com

---

<div align="center">

**🎓 让校园生活更精彩！**

[立即体验](https://your-demo-url.com) · [文档](https://your-docs-url.com) · [反馈](https://github.com/your-username/sayit/issues)

</div>
