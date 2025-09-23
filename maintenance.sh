#!/bin/bash

# SayIt 校园社交平台维护脚本
# 用途: 系统维护、性能优化和健康检查

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# 配置变量
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="sayit"
LOG_DIR="$APP_DIR/logs"

# 日志函数
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

# 检查系统状态
check_system_status() {
    log_header "系统状态检查"
    
    # 检查磁盘空间
    log_info "检查磁盘空间..."
    df -h | grep -E "(Filesystem|/dev/)" | grep -v tmpfs
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log_warning "磁盘使用率过高: ${disk_usage}%"
    else
        log_success "磁盘空间正常: ${disk_usage}%"
    fi
    
    # 检查内存使用
    log_info "检查内存使用..."
    free -h
    
    # 检查系统负载
    log_info "检查系统负载..."
    uptime
    
    # 检查网络连接
    log_info "检查网络连接..."
    if ping -c 1 google.com &> /dev/null; then
        log_success "网络连接正常"
    else
        log_warning "网络连接异常"
    fi
}

# 检查应用状态
check_app_status() {
    log_header "应用状态检查"
    
    # 检查 PM2 进程
    log_info "检查 PM2 进程状态..."
    if command -v pm2 &> /dev/null; then
        pm2 status
        pm2 monit --no-daemon || true
    else
        log_error "PM2 未安装"
    fi
    
    # 检查端口监听
    log_info "检查端口监听状态..."
    netstat -tlnp | grep -E ":3000|:80|:443" || log_warning "未发现监听端口"
    
    # 检查数据库
    log_info "检查数据库状态..."
    local db_file="$APP_DIR/prisma/production.db"
    if [[ -f "$db_file" ]]; then
        log_success "数据库文件存在: $(du -h "$db_file" | cut -f1)"
    else
        log_error "数据库文件不存在: $db_file"
    fi
    
    # 检查应用响应
    log_info "检查应用响应..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        log_success "应用响应正常"
    else
        log_warning "应用响应异常"
    fi
}

# 检查服务状态
check_services() {
    log_header "系统服务检查"
    
    local services=("nginx" "pm2")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log_success "$service 服务运行正常"
        else
            log_warning "$service 服务状态异常"
        fi
    done
}

# 清理日志文件
cleanup_logs() {
    log_header "清理日志文件"
    
    # 清理应用日志
    if [[ -d "$LOG_DIR" ]]; then
        log_info "清理应用日志 (30天前)..."
        find "$LOG_DIR" -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true
        log_success "应用日志清理完成"
    fi
    
    # 清理系统日志
    log_info "清理系统日志..."
    sudo journalctl --vacuum-time=30d || log_warning "系统日志清理失败"
    
    # 清理 Nginx 日志
    if [[ -d "/var/log/nginx" ]]; then
        log_info "压缩 Nginx 日志..."
        sudo logrotate -f /etc/logrotate.d/nginx || log_warning "Nginx 日志轮转失败"
    fi
    
    # 清理 PM2 日志
    if command -v pm2 &> /dev/null; then
        log_info "清理 PM2 日志..."
        pm2 flush || log_warning "PM2 日志清理失败"
    fi
}

# 优化数据库
optimize_database() {
    log_header "数据库优化"
    
    local db_file="$APP_DIR/prisma/production.db"
    
    if [[ -f "$db_file" ]]; then
        log_info "优化数据库文件..."
        
        # 备份数据库
        cp "$db_file" "${db_file}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # 使用 SQLite VACUUM 命令优化
        if command -v sqlite3 &> /dev/null; then
            sqlite3 "$db_file" "VACUUM;"
            log_success "数据库优化完成"
        else
            log_warning "sqlite3 未安装，跳过数据库优化"
        fi
        
        # 显示数据库信息
        log_info "数据库大小: $(du -h "$db_file" | cut -f1)"
        
    else
        log_warning "数据库文件不存在，跳过优化"
    fi
}

# 更新系统包
update_system() {
    log_header "系统更新"
    
    log_info "更新包列表..."
    sudo apt update
    
    log_info "检查可更新的包..."
    local upgradable=$(apt list --upgradable 2>/dev/null | wc -l)
    if [[ $upgradable -gt 1 ]]; then
        log_info "发现 $((upgradable-1)) 个可更新的包"
        log_warning "建议手动执行: sudo apt upgrade"
    else
        log_success "系统已是最新版本"
    fi
    
    # 清理包缓存
    log_info "清理包缓存..."
    sudo apt autoremove -y
    sudo apt autoclean
}

# 更新应用依赖
update_dependencies() {
    log_header "应用依赖更新"
    
    cd "$APP_DIR"
    
    # 检查 npm 安全漏洞
    log_info "检查安全漏洞..."
    npm audit || log_warning "发现安全漏洞"
    
    # 更新依赖包
    log_info "检查依赖更新..."
    npm outdated || true
    
    log_warning "如需更新依赖，请手动执行:"
    log_warning "  npm update && npm run build && pm2 restart $APP_NAME"
}

# 检查 SSL 证书
check_ssl_cert() {
    log_header "SSL 证书检查"
    
    if command -v certbot &> /dev/null; then
        log_info "检查 SSL 证书状态..."
        sudo certbot certificates || log_warning "SSL 证书检查失败"
        
        # 测试证书续期
        log_info "测试证书续期..."
        sudo certbot renew --dry-run || log_warning "证书续期测试失败"
    else
        log_info "Certbot 未安装，跳过 SSL 检查"
    fi
}

# 性能监控
performance_monitor() {
    log_header "性能监控"
    
    # CPU 使用率
    log_info "CPU 使用情况:"
    top -bn1 | grep "Cpu(s)" | cut -c9-
    
    # 内存使用率
    log_info "内存使用情况:"
    free -h | grep -E "(Mem:|Swap:)"
    
    # 磁盘 I/O
    if command -v iostat &> /dev/null; then
        log_info "磁盘 I/O 统计:"
        iostat -x 1 1 | grep -E "(Device|sda|nvme)"
    fi
    
    # 网络连接
    log_info "网络连接统计:"
    ss -s
    
    # 进程占用
    log_info "Top 10 进程 (按内存):"
    ps aux --sort=-%mem | head -11
}

# 安全检查
security_check() {
    log_header "安全检查"
    
    # 检查登录失败日志
    log_info "检查登录失败记录..."
    if [[ -f "/var/log/auth.log" ]]; then
        local failed_logins=$(grep "Failed password" /var/log/auth.log | tail -10 | wc -l)
        if [[ $failed_logins -gt 0 ]]; then
            log_warning "发现 $failed_logins 次登录失败"
        else
            log_success "近期无异常登录"
        fi
    fi
    
    # 检查防火墙状态
    log_info "检查防火墙状态..."
    if command -v ufw &> /dev/null; then
        sudo ufw status || log_warning "防火墙状态检查失败"
    fi
    
    # 检查文件权限
    log_info "检查关键文件权限..."
    ls -la "$APP_DIR/.env.local" 2>/dev/null || log_warning "环境配置文件不存在"
    ls -la "$APP_DIR/prisma/production.db" 2>/dev/null || log_warning "数据库文件不存在"
}

# 生成维护报告
generate_maintenance_report() {
    local report_file="$APP_DIR/maintenance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
===================================
SayIt 校园社交平台维护报告
===================================
维护时间: $(date)
应用目录: $APP_DIR

系统状态:
$(df -h / | tail -1)
$(free -h | grep "Mem:")
$(uptime)

应用状态:
$(pm2 status 2>/dev/null || echo "PM2 状态获取失败")

服务状态:
$(systemctl is-active nginx 2>/dev/null || echo "nginx: 未知")
$(systemctl is-active pm2 2>/dev/null || echo "pm2: 未知")

数据库信息:
$(ls -la "$APP_DIR/prisma/production.db" 2>/dev/null || echo "数据库文件不存在")

日志目录大小:
$(du -sh "$LOG_DIR" 2>/dev/null || echo "日志目录不存在")

安全状态:
$(sudo ufw status 2>/dev/null || echo "防火墙状态未知")

===================================
维护建议:
1. 定期执行系统更新
2. 监控磁盘空间使用
3. 检查应用日志异常
4. 更新安全补丁
5. 备份重要数据
===================================
EOF
    
    log_success "维护报告生成: $report_file"
}

# 显示帮助信息
show_help() {
    echo -e "${WHITE}SayIt 维护脚本使用说明${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --full            执行完整维护 (默认)"
    echo "  --status          仅检查系统和应用状态"
    echo "  --cleanup         仅执行清理操作"
    echo "  --optimize        仅执行数据库优化"
    echo "  --update          仅执行系统更新检查"
    echo "  --security        仅执行安全检查"
    echo "  --performance     仅执行性能监控"
    echo "  --ssl             仅检查 SSL 证书"
    echo "  --help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                 # 执行完整维护"
    echo "  $0 --status        # 仅检查状态"
    echo "  $0 --cleanup       # 仅清理日志"
}

# 主维护流程
main() {
    log_header "SayIt 系统维护开始"
    
    # 检查是否在正确目录
    if [[ ! -f "$APP_DIR/package.json" ]]; then
        log_error "未找到 package.json，请在应用根目录运行此脚本"
        exit 1
    fi
    
    # 执行维护任务
    check_system_status
    check_app_status
    check_services
    cleanup_logs
    optimize_database
    update_system
    update_dependencies
    check_ssl_cert
    performance_monitor
    security_check
    
    # 生成报告
    generate_maintenance_report
    
    log_header "系统维护完成"
}

# 解析命令行参数
case "${1:-}" in
    --status)
        check_system_status
        check_app_status
        check_services
        ;;
    --cleanup)
        cleanup_logs
        ;;
    --optimize)
        optimize_database
        ;;
    --update)
        update_system
        update_dependencies
        ;;
    --security)
        security_check
        ;;
    --performance)
        performance_monitor
        ;;
    --ssl)
        check_ssl_cert
        ;;
    --help)
        show_help
        ;;
    --full|"")
        main
        ;;
    *)
        log_error "未知选项: $1"
        show_help
        exit 1
        ;;
esac
