#!/bin/bash

# 🚀 SayIt 校园社交平台自动化安装和部署脚本
# 支持 Ubuntu/Debian 系统的一键安装、配置和部署
# 合并了安装和部署功能，提供交互式配置

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 默认配置
APP_NAME="sayit"
APP_USER="sayit"
APP_DIR="/home/$APP_USER/$APP_NAME"
REPO_URL="https://github.com/your-username/sayit.git"
BRANCH="main"
DOMAIN=""
EMAIL=""
NODE_VERSION="18"
INSTALL_NGINX="true"
INSTALL_SSL="false"  # 默认跳过SSL
AUTO_START="true"
ACTION="install"
FORCE_DEPLOY="false"
BACKUP_BEFORE_DEPLOY="true"
AUTO_MIGRATION="true"
RESTART_SERVICES="true"

# 日志函数（兼容部署功能）
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# 为了兼容性保留原有的函数名
print_info() { log_info "$1"; }
print_success() { log_success "$1"; }
print_warning() { log_warning "$1"; }
print_error() { log_error "$1"; }
print_header() { log_header "$1"; }

# 检查系统类型
check_system() {
    print_header "检查系统环境"
    
    if [[ "$EUID" -eq 0 ]]; then
        print_error "请不要使用 root 用户运行此脚本"
        exit 1
    fi
    
    if ! command -v apt &> /dev/null; then
        print_error "此脚本仅支持 Ubuntu/Debian 系统"
        exit 1
    fi
    
    # 检查系统版本
    OS_VERSION=$(lsb_release -d | cut -f2)
    print_info "操作系统: $OS_VERSION"
    
    # 检查架构
    ARCH=$(uname -m)
    print_info "系统架构: $ARCH"
    
    print_success "系统检查完成"
}

# 解析命令行参数
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -e|--email)
                EMAIL="$2" 
                shift 2
                ;;
            --repo)
                REPO_URL="$2"
                shift 2
                ;;
            --branch)
                BRANCH="$2"
                shift 2
                ;;
            --user)
                APP_USER="$2"
                APP_DIR="/home/$APP_USER/$APP_NAME"
                shift 2
                ;;
            --dir)
                APP_DIR="$2"
                shift 2
                ;;
            --no-nginx)
                INSTALL_NGINX="false"
                shift
                ;;
            --no-ssl)
                INSTALL_SSL="false"
                shift
                ;;
            --no-autostart)
                AUTO_START="false"
                shift
                ;;
            --no-backup)
                BACKUP_BEFORE_DEPLOY="false"
                shift
                ;;
            --no-migration)
                AUTO_MIGRATION="false"
                shift
                ;;
            --no-restart)
                RESTART_SERVICES="false"
                shift
                ;;
            --force)
                FORCE_DEPLOY="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            install|deploy|rollback|status|logs|update)
                ACTION="$1"
                shift
                if [[ "$ACTION" == "rollback" && -n "$1" && ! "$1" =~ ^-- ]]; then
                    ROLLBACK_VERSION="$1"
                    shift
                fi
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    ACTION=${ACTION:-install}
}

# 显示帮助信息
show_help() {
    echo -e "${WHITE}SayIt 校园社交平台安装和部署脚本${NC}"
    echo ""
    echo "用法: $0 [动作] [选项]"
    echo ""
    echo "动作:"
    echo "  install               全新安装应用 (默认)"
    echo "  deploy                部署/更新应用"
    echo "  rollback [version]    回滚到指定版本"
    echo "  status                查看应用状态"
    echo "  logs                  查看应用日志"
    echo "  update                快速更新代码"
    echo ""
    echo "安装选项:"
    echo "  -d, --domain DOMAIN    设置域名"
    echo "  -e, --email EMAIL      SSL证书邮箱"
    echo "  --repo URL            指定 Git 仓库地址"
    echo "  --branch BRANCH       指定分支 (默认: main)"
    echo "  --user USER           指定应用用户 (默认: sayit)"
    echo "  --dir PATH            指定应用目录"
    echo "  --no-nginx            跳过 Nginx 安装"
    echo "  --no-ssl              跳过 SSL 证书配置 (默认)"
    echo "  --no-autostart        不自动启动服务"
    echo ""
    echo "部署选项:"
    echo "  --no-backup           部署前不备份"
    echo "  --no-migration        跳过数据库迁移"
    echo "  --no-restart          不重启服务"
    echo "  --force               强制部署 (忽略警告)"
    echo ""
    echo "通用选项:"
    echo "  -h, --help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 交互式安装"
    echo "  $0 install -d example.com            # 安装并设置域名"
    echo "  $0 deploy                            # 部署最新版本"
    echo "  $0 deploy --branch develop          # 部署指定分支"
    echo "  $0 rollback v1.2.0                  # 回滚到指定版本"
    echo "  $0 status                            # 查看状态"
    echo "  $0 --no-nginx --no-ssl              # 仅安装应用"
}

# 交互式配置
interactive_config() {
    if [[ "$ACTION" != "install" ]]; then
        return  # 非安装模式跳过交互配置
    fi
    
    print_header "🎯 交互式配置向导"
    echo -e "${CYAN}欢迎使用 SayIt 校园社交平台安装脚本！${NC}"
    echo -e "${YELLOW}我们将引导您完成安装配置${NC}"
    echo ""
    
    # 基础配置
    if [[ -z "$DOMAIN" ]]; then
        echo -e "${WHITE}1. 域名配置${NC}"
        echo -n "请输入域名 (留空表示仅本地访问): "
        read DOMAIN
        echo ""
    fi
    
    # SSL配置
    if [[ -n "$DOMAIN" ]]; then
        echo -e "${WHITE}2. SSL证书配置${NC}"
        echo -n "是否配置 SSL 证书? (y/N，默认跳过): "
        read ssl_choice
        if [[ "$ssl_choice" =~ ^[Yy]$ ]]; then
            INSTALL_SSL="true"
            if [[ -z "$EMAIL" ]]; then
                echo -n "请输入邮箱地址 (用于SSL证书): "
                read EMAIL
            fi
        fi
        echo ""
    fi
    
    # Web服务配置
    echo -e "${WHITE}3. Web服务配置${NC}"
    echo -n "是否安装 Nginx? (Y/n，默认安装): "
    read nginx_choice
    if [[ "$nginx_choice" =~ ^[Nn]$ ]]; then
        INSTALL_NGINX="false"
    fi
    echo ""
    
    # 高级选项
    echo -e "${WHITE}4. 高级选项${NC}"
    echo -n "自定义应用用户名? (留空使用默认: $APP_USER): "
    read custom_user
    if [[ -n "$custom_user" ]]; then
        APP_USER="$custom_user"
        APP_DIR="/home/$APP_USER/$APP_NAME"
    fi
    
    echo -n "自定义安装目录? (留空使用默认: $APP_DIR): "
    read custom_dir
    if [[ -n "$custom_dir" ]]; then
        APP_DIR="$custom_dir"
    fi
    echo ""
    
    # 生成JWT密钥
    print_info "正在生成安全密钥..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
    
    # 确认配置
    print_header "📋 安装配置确认"
    print_info "  动作模式: $ACTION"
    print_info "  应用名称: $APP_NAME"
    print_info "  应用用户: $APP_USER"
    print_info "  安装目录: $APP_DIR"
    print_info "  域名: ${DOMAIN:-"未配置 (本地访问)"}"
    print_info "  安装Nginx: $INSTALL_NGINX"
    print_info "  配置SSL: $INSTALL_SSL"
    print_info "  自动启动: $AUTO_START"
    print_info "  JWT密钥: 已生成 (64字符)"
    
    echo ""
    echo -e "${YELLOW}⚠️  注意事项:${NC}"
    echo -e "  • 安装过程需要 sudo 权限"
    echo -e "  • 建议在全新的系统上安装"
    echo -e "  • 安装时间约 10-20 分钟"
    echo ""
    
    echo -n "确认开始安装? (y/N): "
    read confirmation
    if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
        print_info "安装已取消"
        exit 0
    fi
}

# 更新系统
update_system() {
    print_header "更新系统包"
    
    print_info "更新包列表..."
    sudo apt update
    
    print_info "升级系统包..."
    sudo apt upgrade -y
    
    print_info "安装基础工具..."
    sudo apt install -y curl wget git unzip software-properties-common gnupg2
    
    print_success "系统更新完成"
}

# 安装 Node.js
install_nodejs() {
    print_header "安装 Node.js"
    
    if command -v node &> /dev/null; then
        NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_CURRENT" -ge "$NODE_VERSION" ]]; then
            print_success "Node.js 已安装 (版本: $(node --version))"
            return
        fi
    fi
    
    print_info "添加 NodeSource 仓库..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    
    print_info "安装 Node.js ${NODE_VERSION}..."
    sudo apt install -y nodejs
    
    # 验证安装
    print_info "Node.js 版本: $(node --version)"
    print_info "npm 版本: $(npm --version)"
    
    print_success "Node.js 安装完成"
}

# 安装 PM2
install_pm2() {
    print_header "安装 PM2"
    
    if command -v pm2 &> /dev/null; then
        print_success "PM2 已安装 (版本: $(pm2 --version))"
        return
    fi
    
    print_info "全局安装 PM2..."
    sudo npm install -g pm2
    
    print_success "PM2 安装完成"
}

# 创建应用用户
create_app_user() {
    print_header "创建应用用户"
    
    if id "$APP_USER" &>/dev/null; then
        print_success "用户 $APP_USER 已存在"
        return
    fi
    
    print_info "创建用户 $APP_USER..."
    sudo adduser --disabled-password --gecos "" $APP_USER
    
    # 添加到必要的用户组
    sudo usermod -aG www-data $APP_USER
    
    print_success "用户 $APP_USER 创建完成"
}

# 部署应用代码
deploy_application() {
    print_header "部署应用代码"
    
    # 创建应用目录
    print_info "创建应用目录..."
    sudo mkdir -p $APP_DIR
    sudo chown $APP_USER:$APP_USER $APP_DIR
    
    # 复制当前目录的代码到目标目录
    print_info "复制应用代码..."
    sudo -u $APP_USER cp -r $(pwd)/* $APP_DIR/
    
    # 设置权限
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    print_success "应用代码部署完成"
}

# 安装应用依赖
install_dependencies() {
    print_header "安装应用依赖"
    
    cd $APP_DIR
    
    print_info "安装 npm 依赖..."
    sudo -u $APP_USER npm ci --only=production
    
    print_info "构建应用..."
    sudo -u $APP_USER npm run build
    
    print_success "应用依赖安装完成"
}

# 配置环境变量
setup_environment() {
    print_header "配置环境变量"
    
    # 如果没有JWT_SECRET，则生成一个
    if [[ -z "$JWT_SECRET" ]]; then
        print_info "生成JWT密钥..."
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
    fi
    
    # 确定应用URL
    local app_url=""
    if [[ -n "$DOMAIN" ]]; then
        if [[ "$INSTALL_SSL" == "true" ]]; then
            app_url="https://$DOMAIN"
        else
            app_url="http://$DOMAIN"
        fi
    fi
    
    # 创建生产环境配置
    cat > $APP_DIR/.env.local << EOF
# SayIt 生产环境配置
# 由自动安装脚本生成于: $(date)

NODE_ENV=production

# JWT 认证密钥 (请妥善保管)
JWT_SECRET=$JWT_SECRET

# 数据库配置
DATABASE_URL="file:./prisma/production.db"

# 应用配置
${app_url:+NEXT_PUBLIC_APP_URL=$app_url}

# 文件上传配置
UPLOAD_PATH=$APP_DIR/public/uploads
MAX_FILE_SIZE=10485760

# 应用端口
PORT=3000

# 日志级别
LOG_LEVEL=info

# hCaptcha 人机验证（可选，请替换为您的密钥）
# NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-hcaptcha-site-key
# HCAPTCHA_SECRET_KEY=your-hcaptcha-secret-key

# 邮件配置（可选，用于通知功能）
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# MAIL_FROM=noreply@yourdomain.com
EOF
    
    # 设置文件权限
    sudo chown $APP_USER:$APP_USER $APP_DIR/.env.local
    sudo chmod 600 $APP_DIR/.env.local
    
    print_success "环境变量配置完成"
    print_info "JWT密钥已生成并保存到 .env.local 文件"
}

# 初始化数据库
setup_database() {
    print_header "初始化数据库"
    
    cd $APP_DIR
    
    print_info "初始化数据库架构..."
    sudo -u $APP_USER npm run db:push
    
    print_info "生成 Prisma Client..."
    sudo -u $APP_USER npm run db:generate
    
    print_info "创建初始数据..."
    sudo -u $APP_USER npm run db:init
    
    # 设置数据库文件权限
    sudo chown $APP_USER:$APP_USER $APP_DIR/prisma/production.db
    sudo chmod 664 $APP_DIR/prisma/production.db
    
    print_success "数据库初始化完成"
}

# 安装 Nginx
install_nginx() {
    if [[ "$INSTALL_NGINX" != "true" ]]; then
        print_info "跳过 Nginx 安装"
        return
    fi
    
    print_header "安装 Nginx"
    
    if command -v nginx &> /dev/null; then
        print_success "Nginx 已安装"
    else
        print_info "安装 Nginx..."
        sudo apt install -y nginx
    fi
    
    # 启动并启用 Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_success "Nginx 安装完成"
}

# 配置 Nginx
configure_nginx() {
    if [[ "$INSTALL_NGINX" != "true" ]]; then
        return
    fi
    
    print_header "配置 Nginx"
    
    # 删除默认配置
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 创建应用配置
    NGINX_CONFIG="/etc/nginx/sites-available/$APP_NAME"
    
    if [[ -n "$DOMAIN" ]]; then
        # 有域名的配置
        sudo tee $NGINX_CONFIG > /dev/null << EOF
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL 配置 (将在安装证书后自动更新)
    ssl_certificate /etc/nginx/ssl/cert.crt;
    ssl_certificate_key /etc/nginx/ssl/cert.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 文件上传大小限制
    client_max_body_size 10M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 应用代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    else
        # 无域名的配置（仅HTTP）
        sudo tee $NGINX_CONFIG > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 文件上传大小限制
    client_max_body_size 10M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 应用代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    fi
    
    # 启用站点
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/$APP_NAME
    
    # 测试配置
    if sudo nginx -t; then
        sudo systemctl reload nginx
        print_success "Nginx 配置完成"
    else
        print_error "Nginx 配置错误，请检查"
        exit 1
    fi
}

# 安装 SSL 证书
setup_ssl() {
    if [[ "$INSTALL_SSL" != "true" || -z "$DOMAIN" || -z "$EMAIL" ]]; then
        print_info "跳过 SSL 证书配置"
        return
    fi
    
    print_header "配置 SSL 证书"
    
    # 安装 Certbot
    if ! command -v certbot &> /dev/null; then
        print_info "安装 Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # 获取 SSL 证书
    print_info "获取 Let's Encrypt SSL 证书..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email -n
    
    # 设置自动续期
    print_info "设置证书自动续期..."
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
    
    print_success "SSL 证书配置完成"
}

# 配置 PM2
setup_pm2() {
    print_header "配置 PM2"
    
    # 创建 PM2 配置文件
    sudo -u $APP_USER tee $APP_DIR/ecosystem.config.js > /dev/null << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
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
    node_args: '--max_old_space_size=4096',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git']
  }]
}
EOF
    
    # 创建日志目录
    sudo -u $APP_USER mkdir -p $APP_DIR/logs
    
    print_success "PM2 配置完成"
}

# 启动服务
start_services() {
    if [[ "$AUTO_START" != "true" ]]; then
        print_info "跳过自动启动服务"
        return
    fi
    
    print_header "启动服务"
    
    cd $APP_DIR
    
    # 启动应用
    print_info "启动应用..."
    sudo -u $APP_USER pm2 start ecosystem.config.js
    
    # 设置开机自启
    print_info "设置开机自启..."
    sudo -u $APP_USER pm2 startup | grep -o 'sudo.*' | sudo bash
    sudo -u $APP_USER pm2 save
    
    print_success "服务启动完成"
}

# 创建维护脚本
create_maintenance_scripts() {
    print_header "创建维护脚本"
    
    # 备份脚本
    sudo -u $APP_USER tee $APP_DIR/backup.sh > /dev/null << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR
cp prisma/production.db $BACKUP_DIR/db_backup_$DATE.db
find $BACKUP_DIR -name "db_backup_*.db" -type f -mtime +7 -delete
echo "数据库备份完成: db_backup_$DATE.db"
EOF
    
    # 更新脚本
    sudo -u $APP_USER tee $APP_DIR/update.sh > /dev/null << 'EOF'
#!/bin/bash
cd $(dirname "$0")
echo "开始更新应用..."

# 备份当前版本
cp -r . ../sayit-backup-$(date +%Y%m%d) 2>/dev/null || true

# 拉取最新代码
git pull origin main || {
    echo "Git pull 失败，请手动更新代码"
    exit 1
}

# 安装依赖
npm ci --only=production

# 构建应用
npm run build

# 更新数据库
npm run db:push

# 重启服务
pm2 restart sayit

echo "应用更新完成"
EOF
    
    # 设置执行权限
    sudo chmod +x $APP_DIR/backup.sh
    sudo chmod +x $APP_DIR/update.sh
    
    # 设置定期备份
    (sudo -u $APP_USER crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | sudo -u $APP_USER crontab -
    
    print_success "维护脚本创建完成"
}

# 配置防火墙
setup_firewall() {
    print_header "配置防火墙"
    
    if ! command -v ufw &> /dev/null; then
        print_info "安装 UFW 防火墙..."
        sudo apt install -y ufw
    fi
    
    # 配置防火墙规则
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw --force enable
    
    print_success "防火墙配置完成"
}

# 显示安装总结
show_summary() {
    print_header "安装完成"
    
    echo -e "${GREEN}🎉 SayIt 校园社交平台安装成功！${NC}"
    echo ""
    echo -e "${WHITE}访问信息:${NC}"
    if [[ -n "$DOMAIN" ]]; then
        echo -e "  网站地址: ${CYAN}https://$DOMAIN${NC}"
        echo -e "  HTTP重定向: ${CYAN}http://$DOMAIN${NC}"
    else
        echo -e "  本地访问: ${CYAN}http://localhost:3000${NC}"
        echo -e "  服务器访问: ${CYAN}http://[服务器IP]${NC}"
    fi
    echo ""
    echo -e "${WHITE}默认管理员账户:${NC}"
    echo -e "  用户名: ${YELLOW}admin${NC}"
    echo -e "  密码: ${YELLOW}admin123${NC}"
    echo -e "  ${RED}⚠️  请立即登录并修改默认密码！${NC}"
    echo ""
    echo -e "${WHITE}常用命令:${NC}"
    echo -e "  查看服务状态: ${CYAN}sudo -u $APP_USER pm2 status${NC}"
    echo -e "  查看日志: ${CYAN}sudo -u $APP_USER pm2 logs $APP_NAME${NC}"
    echo -e "  重启服务: ${CYAN}sudo -u $APP_USER pm2 restart $APP_NAME${NC}"
    echo -e "  备份数据库: ${CYAN}sudo -u $APP_USER $APP_DIR/backup.sh${NC}"
    echo -e "  更新应用: ${CYAN}sudo -u $APP_USER $APP_DIR/update.sh${NC}"
    echo ""
    echo -e "${WHITE}重要文件位置:${NC}"
    echo -e "  应用目录: ${CYAN}$APP_DIR${NC}"
    echo -e "  配置文件: ${CYAN}$APP_DIR/.env.local${NC}"
    echo -e "  日志目录: ${CYAN}$APP_DIR/logs/${NC}"
    echo -e "  数据库: ${CYAN}$APP_DIR/prisma/production.db${NC}"
    echo ""
    if [[ "$INSTALL_NGINX" == "true" ]]; then
        echo -e "${WHITE}Nginx 配置:${NC}"
        echo -e "  配置文件: ${CYAN}/etc/nginx/sites-available/$APP_NAME${NC}"
        echo -e "  测试配置: ${CYAN}sudo nginx -t${NC}"
        echo -e "  重启服务: ${CYAN}sudo systemctl restart nginx${NC}"
        echo ""
    fi
    echo -e "${GREEN}✅ 安装指南: 详见项目根目录的 DEPLOYMENT.md${NC}"
    echo -e "${GREEN}✅ 技术支持: 如有问题请查看项目文档或提交 Issue${NC}"
}

# ===============================
# 部署相关功能 (来自deploy.sh)
# ===============================

# 检查部署环境
check_deploy_environment() {
    log_header "部署环境检查"
    
    # 检查用户
    if [[ "$(whoami)" != "$APP_USER" ]]; then
        log_error "请使用 $APP_USER 用户运行部署命令"
        log_info "切换用户: sudo -u $APP_USER $0 $*"
        exit 1
    fi
    
    # 检查应用目录
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "应用目录不存在: $APP_DIR"
        log_info "请先运行 install 安装应用"
        exit 1
    fi
    
    # 检查必要工具
    for cmd in git node npm pm2; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd 未安装"
            exit 1
        fi
    done
    
    log_success "部署环境检查通过"
}

# 检查部署状态
check_deploy_status() {
    log_header "部署状态检查"
    
    cd "$APP_DIR"
    
    # 当前分支和提交
    local current_branch=$(git branch --show-current)
    local current_commit=$(git rev-parse --short HEAD)
    local current_tag=$(git describe --tags --exact-match 2>/dev/null || echo "无标签")
    
    log_info "当前分支: $current_branch"
    log_info "当前提交: $current_commit"
    log_info "当前标签: $current_tag"
    
    # PM2 状态
    log_info "PM2 应用状态:"
    pm2 status | grep -E "(App name|$APP_NAME)" || true
    
    # 应用响应检查
    if curl -s -f http://localhost:3000/health &> /dev/null; then
        log_success "应用响应正常"
    else
        log_warning "应用响应异常"
    fi
    
    # 磁盘空间
    local disk_usage=$(df "$APP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    log_info "磁盘使用率: ${disk_usage}%"
    
    if [[ $disk_usage -gt 90 ]]; then
        log_warning "磁盘空间不足"
    fi
}

# 备份当前版本
backup_current_version() {
    if [[ "$BACKUP_BEFORE_DEPLOY" != "true" ]]; then
        log_info "跳过备份"
        return
    fi
    
    log_header "备份当前版本"
    
    cd "$APP_DIR"
    
    local backup_name="$APP_NAME-backup-$(date +%Y%m%d_%H%M%S)"
    local backup_dir="/home/$APP_USER/backups/$backup_name"
    
    log_info "创建备份目录: $backup_dir"
    mkdir -p "/home/$APP_USER/backups"
    
    log_info "备份应用文件..."
    cp -r "$APP_DIR" "$backup_dir"
    
    # 创建备份信息文件
    cat > "$backup_dir/backup.info" << EOF
备份时间: $(date)
备份版本: $(git rev-parse --short HEAD)
备份分支: $(git branch --show-current)
备份原因: 部署前备份
应用目录: $APP_DIR
EOF
    
    log_success "备份完成: $backup_dir"
    
    # 清理旧备份 (保留最近5个)
    log_info "清理旧备份..."
    ls -t "/home/$APP_USER/backups/" | tail -n +6 | xargs -I {} rm -rf "/home/$APP_USER/backups/{}" 2>/dev/null || true
}

# 拉取最新代码
pull_latest_code() {
    log_header "拉取最新代码"
    
    cd "$APP_DIR"
    
    # 检查工作区状态
    if ! git diff-index --quiet HEAD --; then
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            log_error "工作区有未提交的更改，使用 --force 强制部署"
            git status --porcelain
            exit 1
        else
            log_warning "强制部署，将重置工作区更改"
            git reset --hard HEAD
        fi
    fi
    
    log_info "获取远程更新..."
    git fetch origin
    
    log_info "切换到分支: $BRANCH"
    git checkout "$BRANCH"
    
    log_info "拉取最新代码..."
    git pull origin "$BRANCH"
    
    local new_commit=$(git rev-parse --short HEAD)
    log_success "代码更新完成，当前提交: $new_commit"
}

# 部署安装依赖
deploy_install_dependencies() {
    log_header "安装依赖"
    
    cd "$APP_DIR"
    
    log_info "清理 node_modules..."
    rm -rf node_modules package-lock.json 2>/dev/null || true
    
    log_info "安装生产依赖..."
    npm ci --only=production
    
    log_success "依赖安装完成"
}

# 部署构建应用
deploy_build_application() {
    log_header "构建应用"
    
    cd "$APP_DIR"
    
    log_info "清理构建缓存..."
    rm -rf .next 2>/dev/null || true
    
    log_info "构建应用..."
    npm run build
    
    log_success "应用构建完成"
}

# 数据库迁移
migrate_database() {
    if [[ "$AUTO_MIGRATION" != "true" ]]; then
        log_info "跳过数据库迁移"
        return
    fi
    
    log_header "数据库迁移"
    
    cd "$APP_DIR"
    
    # 备份数据库
    local db_file="$APP_DIR/prisma/production.db"
    if [[ -f "$db_file" ]]; then
        log_info "备份数据库..."
        cp "$db_file" "${db_file}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    log_info "执行数据库迁移..."
    npm run db:push
    
    log_info "生成 Prisma Client..."
    npm run db:generate
    
    log_success "数据库迁移完成"
}

# 重启服务
restart_services() {
    if [[ "$RESTART_SERVICES" != "true" ]]; then
        log_info "跳过服务重启"
        return
    fi
    
    log_header "重启服务"
    
    # 重启 PM2 应用
    log_info "重启 PM2 应用..."
    pm2 restart $APP_NAME || pm2 start ecosystem.config.js
    
    # 检查应用启动
    log_info "等待应用启动..."
    sleep 5
    
    local retry_count=0
    while [[ $retry_count -lt 30 ]]; do
        if curl -s -f http://localhost:3000/health &> /dev/null; then
            log_success "应用启动成功"
            break
        fi
        
        sleep 2
        retry_count=$((retry_count + 1))
    done
    
    if [[ $retry_count -eq 30 ]]; then
        log_error "应用启动失败"
        pm2 logs $APP_NAME --lines 20
        exit 1
    fi
    
    # 重新加载 Nginx (如果存在)
    if systemctl is-active --quiet nginx 2>/dev/null; then
        log_info "重新加载 Nginx..."
        sudo systemctl reload nginx
    fi
    
    log_success "服务重启完成"
}

# 验证部署
verify_deployment() {
    log_header "验证部署"
    
    # 检查应用响应
    log_info "检查应用响应..."
    local response=$(curl -s -w "%{http_code}" http://localhost:3000)
    local status_code="${response: -3}"
    
    if [[ "$status_code" == "200" ]]; then
        log_success "应用响应正常"
    else
        log_error "应用响应异常，状态码: $status_code"
        return 1
    fi
    
    # 检查进程状态
    log_info "检查进程状态..."
    pm2 status | grep $APP_NAME
    
    # 检查日志
    log_info "检查最新日志..."
    pm2 logs $APP_NAME --lines 5 --nostream
    
    log_success "部署验证通过"
}

# 回滚版本
rollback_deployment() {
    local version=${ROLLBACK_VERSION:-}
    
    log_header "版本回滚"
    
    if [[ -z "$version" ]]; then
        log_info "可用备份版本:"
        ls -la "/home/$APP_USER/backups/" | grep "$APP_NAME-backup" || {
            log_error "没有可用的备份版本"
            exit 1
        }
        
        echo -n "请输入要回滚的备份目录名: "
        read version
    fi
    
    local backup_dir="/home/$APP_USER/backups/$version"
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "备份目录不存在: $backup_dir"
        exit 1
    fi
    
    log_warning "即将回滚到: $version"
    echo -n "确认回滚? (y/N): "
    read confirmation
    
    if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
        log_info "回滚已取消"
        exit 0
    fi
    
    # 停止服务
    log_info "停止服务..."
    pm2 stop $APP_NAME || true
    
    # 备份当前版本
    log_info "备份当前版本..."
    local current_backup="/home/$APP_USER/backups/rollback-backup-$(date +%Y%m%d_%H%M%S)"
    cp -r "$APP_DIR" "$current_backup"
    
    # 恢复备份
    log_info "恢复备份版本..."
    rm -rf "$APP_DIR"
    cp -r "$backup_dir" "$APP_DIR"
    
    # 重启服务
    log_info "重启服务..."
    cd "$APP_DIR"
    pm2 start ecosystem.config.js
    
    log_success "回滚完成"
}

# 查看部署日志
show_deploy_logs() {
    log_header "应用日志"
    
    # PM2 日志
    log_info "PM2 应用日志:"
    pm2 logs $APP_NAME --lines 20 || true
    
    # Nginx 日志 (如果存在)
    if [[ -f "/var/log/nginx/access.log" ]]; then
        log_info "Nginx 访问日志 (最近10条):"
        sudo tail -10 /var/log/nginx/access.log || true
    fi
    
    if [[ -f "/var/log/nginx/error.log" ]]; then
        log_info "Nginx 错误日志 (最近10条):"
        sudo tail -10 /var/log/nginx/error.log || true
    fi
}

# 生成部署报告
generate_deploy_report() {
    local report_file="$APP_DIR/deploy_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cd "$APP_DIR"
    
    cat > "$report_file" << EOF
===================================
SayIt 部署报告
===================================
部署时间: $(date)
执行用户: $(whoami)
部署动作: $ACTION

代码信息:
分支: $(git branch --show-current)
提交: $(git rev-parse --short HEAD)
标签: $(git describe --tags --exact-match 2>/dev/null || echo "无标签")

应用状态:
$(pm2 status | grep $APP_NAME || echo "PM2 状态获取失败")

系统状态:
磁盘使用: $(df -h "$APP_DIR" | tail -1)
内存使用: $(free -h | grep "Mem:")

部署结果: $(if verify_deployment &>/dev/null; then echo "成功"; else echo "失败"; fi)

===================================
EOF
    
    log_success "部署报告生成: $report_file"
}

# 快速更新代码
quick_update() {
    log_header "快速更新代码"
    
    cd "$APP_DIR"
    
    log_info "拉取最新代码..."
    git pull origin $BRANCH || {
        log_error "Git pull 失败"
        exit 1
    }
    
    log_info "安装依赖..."
    npm ci --only=production
    
    log_info "构建应用..."
    npm run build
    
    log_info "更新数据库..."
    npm run db:push
    
    log_info "重启服务..."
    pm2 restart $APP_NAME
    
    log_success "快速更新完成"
}

# 主部署流程
deploy_main() {
    log_header "开始部署 $APP_NAME 应用"
    
    check_deploy_environment
    check_deploy_status
    backup_current_version
    pull_latest_code
    deploy_install_dependencies
    deploy_build_application
    migrate_database
    restart_services
    verify_deployment
    generate_deploy_report
    
    log_header "部署完成"
    log_success "🎉 $APP_NAME 应用部署成功！"
}

# ===============================
# 主程序入口
# ===============================

# 主安装流程
install_main() {
    # 显示欢迎信息
    clear
    print_header "🚀 SayIt 校园社交平台自动安装脚本"
    echo -e "${CYAN}本脚本将自动安装和配置 SayIt 校园社交平台${NC}"
    echo -e "${YELLOW}支持系统: Ubuntu 18.04+ / Debian 10+${NC}"
    echo ""
    
    # 检查系统
    check_system
    
    # 交互式配置
    interactive_config
    
    # 执行安装步骤
    update_system
    install_nodejs
    install_pm2
    create_app_user
    deploy_application
    install_dependencies
    setup_environment
    setup_database
    install_nginx
    configure_nginx
    setup_ssl
    setup_pm2
    start_services
    create_maintenance_scripts
    setup_firewall
    
    # 显示安装总结
    show_summary
}

# 主函数
main() {
    # 解析命令行参数
    parse_arguments "$@"
    
    # 根据操作类型执行相应功能
    case "$ACTION" in
        install)
            install_main
            ;;
        deploy)
            deploy_main
            ;;
        rollback)
            rollback_deployment
            ;;
        status)
            check_deploy_status
            ;;
        logs)
            show_deploy_logs
            ;;
        update)
            quick_update
            ;;
        *)
            log_error "未知操作: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# 捕获退出信号
trap 'log_error "操作被中断"; exit 1' INT TERM

# 执行主函数
main "$@"
