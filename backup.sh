#!/bin/bash

# SayIt 校园社交平台数据备份脚本
# 用途: 备份数据库、上传文件和应用配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7  # 保留备份天数

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

# 创建备份目录
create_backup_dir() {
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/uploads"
    mkdir -p "$BACKUP_DIR/config"
    mkdir -p "$BACKUP_DIR/logs"
}

# 备份数据库
backup_database() {
    log_info "开始备份数据库..."
    
    local db_file="$APP_DIR/prisma/production.db"
    local backup_file="$BACKUP_DIR/database/db_backup_$DATE.db"
    
    if [[ -f "$db_file" ]]; then
        cp "$db_file" "$backup_file"
        
        # 压缩数据库备份
        gzip "$backup_file"
        
        log_success "数据库备份完成: db_backup_$DATE.db.gz"
        
        # 生成备份信息
        local info_file="$BACKUP_DIR/database/db_backup_$DATE.info"
        cat > "$info_file" << EOF
备份时间: $(date)
数据库文件: $db_file
备份大小: $(du -h "$backup_file.gz" | cut -f1)
备份路径: $backup_file.gz
EOF
        
    else
        log_warning "数据库文件不存在: $db_file"
    fi
}

# 备份上传文件
backup_uploads() {
    log_info "开始备份上传文件..."
    
    local uploads_dir="$APP_DIR/public/uploads"
    local backup_file="$BACKUP_DIR/uploads/uploads_$DATE.tar.gz"
    
    if [[ -d "$uploads_dir" && "$(ls -A $uploads_dir 2>/dev/null)" ]]; then
        tar -czf "$backup_file" -C "$APP_DIR/public" uploads/
        log_success "上传文件备份完成: uploads_$DATE.tar.gz"
        
        # 生成备份信息
        local info_file="$BACKUP_DIR/uploads/uploads_$DATE.info"
        cat > "$info_file" << EOF
备份时间: $(date)
上传目录: $uploads_dir
文件数量: $(find "$uploads_dir" -type f | wc -l)
备份大小: $(du -h "$backup_file" | cut -f1)
备份路径: $backup_file
EOF
        
    else
        log_warning "上传目录为空或不存在: $uploads_dir"
    fi
}

# 备份配置文件
backup_config() {
    log_info "开始备份配置文件..."
    
    local config_backup="$BACKUP_DIR/config/config_$DATE.tar.gz"
    
    # 备份重要配置文件
    tar -czf "$config_backup" \
        -C "$APP_DIR" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="*.log" \
        --exclude="public/uploads" \
        --exclude="prisma/*.db*" \
        .env.local \
        ecosystem.config.js \
        next.config.ts \
        package.json \
        prisma/schema.prisma \
        2>/dev/null || true
    
    log_success "配置文件备份完成: config_$DATE.tar.gz"
}

# 备份日志文件
backup_logs() {
    log_info "开始备份日志文件..."
    
    local logs_dir="$APP_DIR/logs"
    local logs_backup="$BACKUP_DIR/logs/logs_$DATE.tar.gz"
    
    if [[ -d "$logs_dir" && "$(ls -A $logs_dir 2>/dev/null)" ]]; then
        tar -czf "$logs_backup" -C "$APP_DIR" logs/
        log_success "日志文件备份完成: logs_$DATE.tar.gz"
    else
        log_warning "日志目录为空或不存在: $logs_dir"
    fi
}

# 清理过期备份
cleanup_old_backups() {
    log_info "清理 $KEEP_DAYS 天前的备份文件..."
    
    # 清理数据库备份
    find "$BACKUP_DIR/database" -name "db_backup_*.db.gz" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/database" -name "db_backup_*.info" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
    
    # 清理上传文件备份
    find "$BACKUP_DIR/uploads" -name "uploads_*.tar.gz" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/uploads" -name "uploads_*.info" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
    
    # 清理配置文件备份
    find "$BACKUP_DIR/config" -name "config_*.tar.gz" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
    
    # 清理日志文件备份
    find "$BACKUP_DIR/logs" -name "logs_*.tar.gz" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
    
    log_success "过期备份清理完成"
}

# 生成备份报告
generate_report() {
    local report_file="$BACKUP_DIR/backup_report_$DATE.txt"
    
    cat > "$report_file" << EOF
===================================
SayIt 校园社交平台备份报告
===================================
备份时间: $(date)
备份目录: $BACKUP_DIR
保留天数: $KEEP_DAYS

数据库备份:
$(ls -la "$BACKUP_DIR/database/" 2>/dev/null | grep "db_backup_$DATE" || echo "无")

上传文件备份:
$(ls -la "$BACKUP_DIR/uploads/" 2>/dev/null | grep "uploads_$DATE" || echo "无")

配置文件备份:
$(ls -la "$BACKUP_DIR/config/" 2>/dev/null | grep "config_$DATE" || echo "无")

日志文件备份:
$(ls -la "$BACKUP_DIR/logs/" 2>/dev/null | grep "logs_$DATE" || echo "无")

存储使用情况:
$(du -sh "$BACKUP_DIR" 2>/dev/null || echo "无法获取")

系统信息:
磁盘使用: $(df -h . | tail -1)
内存使用: $(free -h | grep "Mem:" || echo "无法获取")
负载情况: $(uptime)

===================================
EOF
    
    log_success "备份报告生成完成: backup_report_$DATE.txt"
}

# 发送备份通知 (可选)
send_notification() {
    # 这里可以添加邮件或其他通知方式
    # 例如发送到企业微信、钉钉等
    
    local report_file="$BACKUP_DIR/backup_report_$DATE.txt"
    
    # 示例: 发送邮件通知
    # if command -v mail &> /dev/null; then
    #     mail -s "SayIt 备份完成 - $DATE" admin@your-domain.com < "$report_file"
    # fi
    
    log_info "备份通知功能未启用"
}

# 显示备份统计
show_stats() {
    log_info "备份统计信息:"
    echo "  备份目录: $BACKUP_DIR"
    echo "  总大小: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
    echo "  数据库备份数: $(ls "$BACKUP_DIR/database/"*.gz 2>/dev/null | wc -l)"
    echo "  上传文件备份数: $(ls "$BACKUP_DIR/uploads/"*.tar.gz 2>/dev/null | wc -l)"
    echo "  配置备份数: $(ls "$BACKUP_DIR/config/"*.tar.gz 2>/dev/null | wc -l)"
    echo "  日志备份数: $(ls "$BACKUP_DIR/logs/"*.tar.gz 2>/dev/null | wc -l)"
}

# 主备份流程
main() {
    log_info "开始 SayIt 数据备份..."
    
    # 检查是否在正确目录
    if [[ ! -f "$APP_DIR/package.json" ]]; then
        log_error "未找到 package.json，请在应用根目录运行此脚本"
        exit 1
    fi
    
    # 创建备份目录
    create_backup_dir
    
    # 执行备份
    backup_database
    backup_uploads
    backup_config
    backup_logs
    
    # 清理过期备份
    cleanup_old_backups
    
    # 生成报告
    generate_report
    
    # 发送通知
    send_notification
    
    # 显示统计
    show_stats
    
    log_success "备份任务完成！"
}

# 检查参数
case "${1:-}" in
    --database-only)
        log_info "仅备份数据库"
        create_backup_dir
        backup_database
        ;;
    --uploads-only)
        log_info "仅备份上传文件"
        create_backup_dir
        backup_uploads
        ;;
    --config-only)
        log_info "仅备份配置文件"
        create_backup_dir
        backup_config
        ;;
    --cleanup)
        log_info "仅清理过期备份"
        cleanup_old_backups
        ;;
    --stats)
        show_stats
        ;;
    --help)
        echo "SayIt 备份脚本使用说明:"
        echo ""
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  无参数         - 执行完整备份"
        echo "  --database-only - 仅备份数据库"
        echo "  --uploads-only  - 仅备份上传文件"
        echo "  --config-only   - 仅备份配置文件"
        echo "  --cleanup       - 仅清理过期备份"
        echo "  --stats         - 显示备份统计"
        echo "  --help          - 显示此帮助"
        ;;
    *)
        main
        ;;
esac
