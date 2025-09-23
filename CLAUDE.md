# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev                    # Start development server with Turbopack (port 3000)
npm run dev:3000              # Development server on port 3000
npm run dev:3001              # Development server on port 3001
npm run dev:8080              # Development server on port 8080
npm run dev:13000             # Development server on port 13000
npm run build                 # Build production version
npm run start                 # Start production server
npm run lint                  # Run ESLint code linting
```

### Database Management
```bash
npm run db:push               # Push database schema changes to SQLite
npm run db:generate           # Generate Prisma client
npm run db:init               # Initialize database with schema and seed data (creates admin user)
npm run db:studio             # Open Prisma Studio database GUI
npm run db:reset              # Reset database (removes dev.db and reinitializes)
npm run setup                 # Complete setup: install deps + db init
```

### Database Scripts
```bash
npm run db:check-users        # Check user accounts in database
npm run fix-uploads           # Fix upload file paths/references
```

## Project Architecture

This is a **Next.js 15 full-stack application** using App Router with a campus social platform theme. The app includes:

### Core Modules
- **Confessions (表白墙)** - Anonymous/named confession posts
- **Posts (校园圈)** - Campus social posts with categories/tags
- **Market (跳蚤市场)** - Second-hand item marketplace
- **Tasks (悬赏任务)** - Task/job posting system
- **Universal Search** - Cross-module content search

### Authentication & Security
- **JWT-based authentication** with access + refresh tokens stored in httpOnly cookies
- **Role-based access control**: STUDENT, ADMIN, MODERATOR
- **Edge-compatible middleware** (`src/middleware.ts`) for route protection
- **Comprehensive validation** in `src/lib/auth.ts` with XSS protection, username validation, and input sanitization
- **Caching layer** (`src/lib/auth-cache.ts`) for token and user session optimization

### Database Architecture (Prisma + SQLite)
**Core entities:**
- `User` - User accounts with role-based permissions
- `Confession` - Anonymous confession posts
- `Post` - Social posts with categories and tags
- `MarketItem` - Marketplace items with condition/status tracking
- `Task` - Task posts with reward system
- `Comment` - Unified commenting system across all content types
- `Like` - Unified like system across all content types
- `ViewRecord` - View tracking with IP/user analytics

**Key relationships:**
- Users can create content across all modules
- Unified commenting system supports nested replies
- Like system works across all content types
- View tracking includes both authenticated users and anonymous visitors

### Frontend Architecture
- **Server + Client Components** - Hybrid rendering with Next.js App Router
- **TypeScript throughout** - Complete type safety with `src/types/index.ts`
- **Tailwind CSS** - Utility-first styling with responsive design
- **Radix UI components** - Accessible UI primitives in `src/components/ui/`
- **Custom hooks** for data fetching, authentication, infinite scroll
- **Responsive design** - Mobile-first with waterfall/grid layouts

### Key Libraries & Tools
- **Prisma** - Database ORM with SQLite
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token management
- **Lucide React** - Icon library
- **browser-image-compression** - Client-side image optimization
- **ESLint** - Code linting with Next.js config

### File Upload System
- Images stored in `public/uploads/` directory
- Client-side compression before upload
- Image galleries with viewer support
- Multiple image support across all content types

## Important Development Notes

### Environment Configuration
Requires `.env.local` with:
```bash
JWT_SECRET=your-super-secret-key-here    # Required for authentication
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=key       # Optional: hCaptcha integration
HCAPTCHA_SECRET_KEY=secret               # Optional: hCaptcha verification
```

### Default Admin Account
After running `npm run db:init`, a default admin account is created:
- Username: `admin`
- Password: `admin123`

### Authentication Flow
1. Login creates JWT access token (7-day expiry) + refresh token
2. Middleware (`src/middleware.ts`) protects routes and handles token validation
3. Client-side auth context (`src/lib/auth-context.tsx`) manages auth state
4. Token refresh happens automatically via `src/lib/auth-client.ts`

### Code Organization Patterns
- **API routes** follow REST conventions in `src/app/api/`
- **Page components** use server components for initial data
- **Shared components** in `src/components/` with reusable UI patterns
- **Utility functions** centralized in `src/lib/`
- **Type definitions** consolidated in `src/types/index.ts`

### Development Best Practices
- Use server components for initial page loads, client components for interactivity
- All API responses follow `ApiResponse<T>` type interface
- Database queries use Prisma with proper indexing for performance
- Input validation occurs both client and server-side
- Images are compressed and optimized before upload

### Performance Optimizations
- Database indexes on frequently queried fields (createdAt, authorId, category)
- Authentication caching with LRU cache for token validation
- Infinite scroll pagination for large content lists
- Image compression and lazy loading
- Turbopack for fast development builds

- 用中文回答。
- 优秀的 Git Commit 标准<type>(<scope>): <subject> —— 使用规范化类型，范围可选，主题用简洁祈使句，必要时补充 body 与 footer。Commit 一律使用英文。
- 此项目统一使用pnpm管理。