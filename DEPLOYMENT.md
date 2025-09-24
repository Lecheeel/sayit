# 🚀 SayIt 生产环境部署指南

> 本文档详细说明如何在生产环境中部署和启动 SayIt 校园社交平台

## 📋 目录

- [系统要求](#系统要求)
- [服务器准备](#服务器准备)
- [部署步骤](#部署步骤)
- [环境配置](#环境配置)
- [数据库设置](#数据库设置)
- [SSL证书配置](#ssl证书配置)
- [反向代理设置](#反向代理设置)
- [进程管理](#进程管理)
- [监控与维护](#监控与维护)
- [故障排查](#故障排查)

## 🔧 系统要求

### 服务器配置
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **内存**: 最低 2GB RAM（推荐 4GB+）
- **存储**: 最低 20GB 硬盘空间（推荐 50GB+）
- **网络**: 稳定的互联网连接

### 软件环境
- **Node.js**: v18.0.0 或更高版本
- **npm**: v9.0.0 或更高版本
- **Git**: 用于代码部署
- **Nginx**: 反向代理服务器（推荐）
- **PM2**: 进程管理器（推荐）

## 🖥️ 服务器准备

### 1. 更新系统包
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. 安装 Node.js
```bash
# 使用 NodeSource 官方源安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或者使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 3. 安装必要软件
```bash
# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2
sudo npm install -g pm2

# 安装 Git
sudo apt install git -y
```

## 📦 部署步骤

### 1. 创建部署用户（推荐）
```bash
# 创建专用用户
sudo adduser sayit
sudo usermod -aG sudo sayit

# 切换到部署用户
su - sayit
```

### 2. 克隆项目代码
```bash
# 克隆项目到服务器
git clone https://github.com/your-username/sayit.git
cd sayit

# 或者从本地上传代码包
# scp -r ./sayit user@server:/home/sayit/
```

### 3. 安装依赖
```bash
# 安装生产依赖
npm ci --only=production

# 或者安装全部依赖（用于构建）
npm install
```

### 4. 构建生产版本
```bash
# 构建项目
npm run build
```

```bash
# 默认端口启动
npm run start
```
## ⚙️ 环境配置

### 1. 创建生产环境配置
```bash
# 复制环境变量模板
cp example.env.example .env.local

# 编辑环境变量
nano .env.local
```

### 2. 生产环境变量设置
```bash
# 数据库配置
DATABASE_URL="file:./prisma/production.db"

# JWT 密钥（必须更换为强密钥）
JWT_SECRET="your-super-secure-jwt-secret-key-here"

# hCaptcha 人机验证（可选，建议配置）
NEXT_PUBLIC_HCAPTCHA_SITE_KEY="your-hcaptcha-site-key"
HCAPTCHA_SECRET_KEY="your-hcaptcha-secret-key"

# 应用配置
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# 文件上传路径
UPLOAD_PATH="/var/www/sayit/uploads"
```

### 3. 生成强密钥
```bash
# 生成 JWT 密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🗄️ 数据库设置

### 1. 初始化生产数据库
```bash
# 推送数据库架构
npm run db:push

# 生成 Prisma Client
npm run db:generate

# 初始化数据（创建管理员账户等）
npm run db:init
```

### 2. 数据库文件权限设置
```bash
# 确保数据库文件权限正确
chmod 664 prisma/production.db
chown sayit:sayit prisma/production.db
```

### 3. 数据库备份脚本
```bash
# 创建备份脚本
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp prisma/production.db backups/db_backup_$DATE.db
# 保留最近7天的备份
find backups/ -name "db_backup_*.db" -type f -mtime +7 -delete
EOF

chmod +x backup-db.sh
mkdir -p backups
```

## 🔐 SSL证书配置

### 1. 使用 Let's Encrypt（免费SSL）
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 手动证书配置
```bash
# 将证书文件放置到指定目录
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.crt /etc/nginx/ssl/
sudo cp your-private.key /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/*
```

## 🔄 反向代理设置

### 1. Nginx 配置
```bash
# 创建 Nginx 站点配置
sudo nano /etc/nginx/sites-available/sayit
```

### 2. Nginx 配置文件内容
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 文件上传限制
    client_max_body_size 10M;

    # 静态文件服务
    location /uploads/ {
        alias /home/sayit/sayit/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 主应用代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3. 启用站点配置
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/sayit /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 📊 进程管理

### 1. PM2 配置文件
```bash
# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sayit',
    script: 'npm',
    args: 'start',
    cwd: '/home/sayit/sayit',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=4096'
  }]
}
EOF

# 创建日志目录
mkdir -p logs
```

### 2. 启动应用
```bash
# 使用 PM2 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 3. PM2 常用命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs sayit

# 重启应用
pm2 restart sayit

# 停止应用
pm2 stop sayit

# 删除应用
pm2 delete sayit

# 重新加载配置
pm2 reload ecosystem.config.js
```

## 📈 监控与维护

### 1. 系统监控
```bash
# 安装 htop 监控工具
sudo apt install htop -y

# 安装 PM2 监控
pm2 install pm2-server-monit
```

### 2. 日志轮转设置
```bash
# 创建 logrotate 配置
sudo nano /etc/logrotate.d/sayit

# 配置内容：
/home/sayit/sayit/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    copytruncate
    notifempty
}
```

### 3. 定期任务设置
```bash
# 设置定期任务
crontab -e

# 添加以下任务：
# 每天凌晨2点备份数据库
0 2 * * * cd /home/sayit/sayit && ./backup-db.sh

# 每天重启应用（可选）
0 4 * * * /usr/bin/pm2 restart sayit

# 清理旧日志
0 3 * * * find /home/sayit/sayit/logs -name "*.log" -mtime +30 -delete
```

## 🔧 故障排查

### 1. 应用无法启动
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查应用日志
pm2 logs sayit

# 检查系统资源
htop
df -h
```

### 2. 数据库问题
```bash
# 检查数据库文件权限
ls -la prisma/production.db

# 重新生成 Prisma Client
npm run db:generate

# 重新推送数据库架构
npm run db:push
```

### 3. Nginx 问题
```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx
```

### 4. SSL 证书问题
```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期证书
sudo certbot renew

# 测试SSL配置
curl -I https://your-domain.com
```

## 📱 更新部署

### 1. 应用更新流程
```bash
# 1. 备份当前版本
cp -r sayit sayit-backup-$(date +%Y%m%d)

# 2. 拉取最新代码
cd sayit
git pull origin main

# 3. 安装新依赖
npm ci --only=production

# 4. 重新构建
npm run build

# 5. 更新数据库（如有变更）
npm run db:push

# 6. 重启应用
pm2 restart sayit
```

### 2. 回滚方案
```bash
# 如果更新出现问题，回滚到备份版本
pm2 stop sayit
cd ..
mv sayit sayit-failed
mv sayit-backup-YYYYMMDD sayit
cd sayit
pm2 start ecosystem.config.js
```

## 🛡️ 安全建议

### 1. 服务器安全
```bash
# 更改 SSH 默认端口
sudo nano /etc/ssh/sshd_config
# Port 2222

# 禁用 root 用户 SSH 登录
# PermitRootLogin no

# 重启 SSH 服务
sudo systemctl restart ssh
```

### 2. 应用安全
- 定期更新依赖包 `npm audit fix`
- 使用强密码和 JWT 密钥
- 定期备份数据库和代码
- 监控应用日志异常访问

## 🎯 性能优化

### 1. 应用级优化
- 启用 Next.js 静态文件缓存
- 配置 CDN 加速静态资源
- 使用 PM2 集群模式
- 启用 Gzip 压缩

### 2. 数据库优化
- 定期清理过期数据
- 添加必要的数据库索引
- 监控数据库性能

### 3. Nginx 优化
```nginx
# 在 Nginx 配置中添加
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 启用缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## ✅ 验证部署

### 1. 功能测试
- [ ] 访问主页是否正常加载
- [ ] 用户注册登录功能正常
- [ ] 各功能模块（表白墙、校园圈等）正常
- [ ] 图片上传功能正常
- [ ] 搜索功能正常

### 2. 性能测试
```bash
# 使用 curl 测试响应速度
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com

# 使用在线工具测试
# - GTmetrix
# - PageSpeed Insights
# - Pingdom
```

---

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 检查日志文件：`pm2 logs sayit`
2. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`
3. 参考本文档的故障排查章节
4. 提交 GitHub Issue 寻求帮助

**部署完成后，记得修改默认管理员账户密码！**

---

<div align="center">

**🎉 部署成功！享受您的 SayIt 校园社交平台！**

</div>
