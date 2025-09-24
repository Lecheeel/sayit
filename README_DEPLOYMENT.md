# 🚀 SayIt 自动化部署指南

> 本文档提供完整的自动化部署方案，包括安装脚本、nginx配置和维护工具

## 📋 文件说明

本部署方案包含以下文件：

```
sayit/
├── install.sh              # 一键安装脚本
├── deploy.sh               # 一键部署脚本  
├── backup.sh               # 数据备份脚本
├── maintenance.sh          # 系统维护脚本
├── ecosystem.config.js     # PM2 进程管理配置
├── nginx.conf.template     # Nginx 配置模板
└── env.production.template # 环境变量配置模板
```

## 🔧 快速部署

### 1. 全自动安装（推荐）

```bash
# 下载项目到服务器
git clone https://github.com/Lecheeel/sayit.git
cd sayit

# 给安装脚本执行权限
chmod +x install.sh

# 执行一键安装（带域名和SSL）
./install.sh -d your-domain.com -e your-email@domain.com

# 或仅安装应用（无nginx）
./install.sh --no-nginx --no-ssl
```

### 2. 手动分步安装

如果自动安装失败，可以分步执行：

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 PM2
sudo npm install -g pm2

# 4. 创建应用用户
sudo adduser sayit
sudo usermod -aG www-data sayit

# 5. 切换到应用用户并部署
sudo su - sayit
git clone https://github.com/Lecheeel/sayit.git
cd sayit

# 6. 安装依赖和构建
npm ci --only=production
npm run build

# 7. 配置环境变量
cp env.production.template .env.local
nano .env.local  # 编辑配置

# 8. 初始化数据库
npm run db:init

# 9. 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## ⚙️ 配置说明

### 环境变量配置

复制 `env.production.template` 为 `.env.local` 并修改：

```bash
# 必需配置
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key-here-change-this
DATABASE_URL="file:./prisma/production.db"
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 可选配置
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-hcaptcha-site-key
HCAPTCHA_SECRET_KEY=your-hcaptcha-secret-key
```

### Nginx 配置

安装脚本会自动配置nginx，手动配置请参考：

```bash
# 复制配置模板
sudo cp nginx.conf.template /etc/nginx/sites-available/sayit

# 修改域名配置
sudo nano /etc/nginx/sites-available/sayit

# 启用站点
sudo ln -s /etc/nginx/sites-available/sayit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📦 部署管理

### 应用部署

```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 部署最新版本
./deploy.sh

# 部署指定分支
./deploy.sh --branch develop

# 强制部署（忽略本地更改）
./deploy.sh --force

# 回滚到指定版本
./deploy.sh rollback backup-20240101_120000

# 查看部署状态
./deploy.sh status

# 查看部署日志
./deploy.sh logs
```

### 数据备份

```bash
# 给备份脚本执行权限
chmod +x backup.sh

# 完整备份
./backup.sh

# 仅备份数据库
./backup.sh --database-only

# 仅备份上传文件
./backup.sh --uploads-only

# 查看备份统计
./backup.sh --stats

# 清理过期备份
./backup.sh --cleanup
```

### 系统维护

```bash
# 给维护脚本执行权限
chmod +x maintenance.sh

# 完整系统维护
./maintenance.sh

# 仅检查状态
./maintenance.sh --status

# 仅清理日志
./maintenance.sh --cleanup

# 仅数据库优化
./maintenance.sh --optimize

# 仅安全检查
./maintenance.sh --security
```

## 🔐 SSL 证书管理

### 自动配置 SSL（Let's Encrypt）

```bash
# 安装时自动配置
./install.sh -d your-domain.com -e your-email@domain.com

# 手动配置 SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### SSL 证书续期

```bash
# 测试续期
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew

# 检查证书状态
sudo certbot certificates
```

## 📊 监控和日志

### PM2 进程监控

```bash
# 查看进程状态
pm2 status

# 查看详细信息
pm2 show sayit

# 查看日志
pm2 logs sayit

# 实时监控
pm2 monit

# 重启应用
pm2 restart sayit

# 重新加载（零停机）
pm2 reload sayit
```

### 系统监控

```bash
# 系统资源
htop
df -h
free -h

# 网络连接（将 3000 替换为你的应用端口）
netstat -tulpn | grep :3000
ss -tulpn | grep :80

# 服务状态
systemctl status nginx
systemctl status pm2-sayit
```

## 🛠️ 常见问题

### 1. 应用启动失败

```bash
# 检查日志
pm2 logs sayit

# 检查端口占用（将 3000 替换为你的应用端口）
sudo netstat -tulpn | grep :3000

# 重启服务
pm2 restart sayit

# 检查环境变量
cat .env.local
```

### 2. Nginx 配置错误

```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重启服务
sudo systemctl restart nginx
```

### 3. 数据库问题

```bash
# 检查数据库文件
ls -la prisma/production.db

# 重新生成 Prisma Client
npm run db:generate

# 重新初始化数据库
npm run db:init
```

### 4. SSL 证书问题

```bash
# 检查证书状态
sudo certbot certificates

# 重新获取证书
sudo certbot --nginx -d your-domain.com --force-renewal

# 检查证书有效期
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

## 🔄 更新流程

### 日常更新

```bash
# 1. 备份数据
./backup.sh

# 2. 部署新版本
./deploy.sh

# 3. 验证部署
curl -I http://your-domain.com
./deploy.sh status
```

### 版本回滚

```bash
# 查看可回滚版本
ls ~/backups/

# 回滚到指定版本
./deploy.sh rollback sayit-backup-20240101_120000

# 验证回滚
./deploy.sh status
```

## 📅 定期维护

### 设置定时任务

```bash
# 编辑定时任务
crontab -e

# 添加以下任务：
# 每天凌晨2点备份数据
0 2 * * * /home/sayit/sayit/backup.sh

# 每周日凌晨3点执行系统维护
0 3 * * 0 /home/sayit/sayit/maintenance.sh

# 每天重启应用（可选）
0 4 * * * /usr/bin/pm2 restart sayit

# SSL证书自动续期
0 12 * * * /usr/bin/certbot renew --quiet
```

### 监控检查清单

- [ ] 每日检查应用状态
- [ ] 每日检查磁盘空间
- [ ] 每周检查系统更新
- [ ] 每月检查SSL证书
- [ ] 每月清理日志文件
- [ ] 每季度更新依赖包

## 🚨 紧急处理

### 服务器宕机恢复

```bash
# 1. 重启相关服务
sudo systemctl restart nginx
pm2 restart all

# 2. 检查系统状态
./maintenance.sh --status

# 3. 如有问题回滚
./deploy.sh rollback [backup-version]
```

### 数据恢复

```bash
# 1. 停止应用
pm2 stop sayit

# 2. 恢复数据库
cp ~/backups/database/db_backup_YYYYMMDD_HHMMSS.db.gz ./
gunzip db_backup_YYYYMMDD_HHMMSS.db.gz
mv db_backup_YYYYMMDD_HHMMSS.db prisma/production.db

# 3. 恢复上传文件
cd public
tar -xzf ~/backups/uploads/uploads_YYYYMMDD_HHMMSS.tar.gz

# 4. 重启应用
pm2 start sayit
```

## 📞 技术支持

遇到问题时的排查步骤：

1. **查看日志**: `pm2 logs sayit`
2. **检查状态**: `./deploy.sh status`
3. **系统维护**: `./maintenance.sh --status`
4. **查看文档**: 参考 `DEPLOYMENT.md`
5. **提交Issue**: GitHub Issues

---

## 🎯 性能优化建议

1. **启用CDN**: 配置静态资源CDN加速
2. **数据库优化**: 定期执行 `./maintenance.sh --optimize`
3. **缓存配置**: 启用Redis缓存（可选）
4. **负载均衡**: 多实例部署（高并发场景）
5. **监控告警**: 集成监控系统（如Prometheus）

---

<div align="center">

**🎉 部署完成！享受您的 SayIt 校园社交平台！**

[🏠 返回主页](README.md) · [📚 部署文档](DEPLOYMENT.md) · [🐛 问题反馈](https://github.com/your-username/sayit/issues)

</div>
