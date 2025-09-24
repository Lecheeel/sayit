// PM2 配置文件 - SayIt 校园社交平台
module.exports = {
  apps: [
    {
      // 应用基本信息
      name: 'sayit',
      script: 'npm',
      args: 'start',
      cwd: '/home/sayit/sayit',
      
      // 集群配置
      instances: 'max', // 使用所有 CPU 核心
      exec_mode: 'cluster', // 集群模式
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 日志配置
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      
      // 性能配置
      max_memory_restart: '1G', // 内存超过 1GB 时重启
      node_args: '--max_old_space_size=4096', // Node.js 最大内存 4GB
      
      // 监控配置
      watch: false, // 生产环境不监控文件变化
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log',
        'public/uploads'
      ],
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // 健康检查
      kill_timeout: 5000,
      listen_timeout: 8000,
      wait_ready: true,
      
      // 进程配置
      combine_logs: true,
      merge_logs: true,
      
      // 源码管理
      source_map_support: true,
      
      // 自定义启动脚本 (可选)
      // script: './server.js',
      
      // 多环境配置
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      env_staging: {
        NODE_ENV: 'staging', 
        PORT: 3001
      }
    },
    
    // 备用实例配置 (可选)
    {
      name: 'sayit-backup',
      script: 'npm',
      args: 'start',
      cwd: '/home/sayit/sayit',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backup-err.log',
      out_file: './logs/backup-out.log',
      log_file: './logs/backup-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max_old_space_size=2048',
      watch: false,
      autorestart: true,
      // 默认不启动，作为备用
      autostart: false
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'sayit',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/Lecheeel/sayit.git',
      path: '/home/sayit/sayit',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
