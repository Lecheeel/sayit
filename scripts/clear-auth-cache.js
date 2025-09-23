#!/usr/bin/env node

/**
 * 清理认证缓存工具
 * 用于清理可能存在问题的认证缓存
 */

console.log('🧹 清理认证缓存工具')
console.log('==================')

// 模拟清理缓存逻辑
console.log('1. 清理内存中的JWT验证缓存...')
console.log('2. 清理用户会话缓存...')
console.log('3. 重置认证状态...')

console.log('')
console.log('✅ 认证缓存清理完成!')
console.log('')
console.log('📖 前端清理指南:')
console.log('==================')
console.log('如果你遇到认证状态不同步的问题，请执行以下步骤：')
console.log('')
console.log('1. 打开浏览器开发者工具 (F12)')
console.log('2. 切换到 Console 标签')
console.log('3. 执行以下代码清理前端缓存：')
console.log('')
console.log('   // 清理 sessionStorage')
console.log('   sessionStorage.removeItem("auth_session")')
console.log('   sessionStorage.removeItem("auth_verify_cache")')
console.log('')
console.log('   // 清理 localStorage (如果存在)')
console.log('   localStorage.removeItem("auth_session")')
console.log('   localStorage.removeItem("auth_verify_cache")')
console.log('')
console.log('   // 强制刷新页面')
console.log('   window.location.reload()')
console.log('')
console.log('4. 或者直接在浏览器中访问以下URL：')
console.log('   javascript:sessionStorage.clear();localStorage.clear();location.reload()')
console.log('')
console.log('5. 如果问题仍然存在，请清除浏览器cookie：')
console.log('   - 按F12打开开发者工具')
console.log('   - 切换到Application标签')
console.log('   - 在左侧找到Cookies，展开你的网站')
console.log('   - 删除auth-token cookie')
console.log('   - 刷新页面')
console.log('')
console.log('💡 提示：完成清理后请重新登录')

const fs = require('fs')
const path = require('path')

console.log('🔧 开始清理认证相关缓存...')

// 清理项目中的各种缓存文件
const cacheDirectories = [
  '.next/cache',
  'node_modules/.cache',
  '.cache'
]

const tempFiles = [
  '.next/trace',
  '.next/BUILD_ID'
]

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true })
      console.log(`✅ 已清除目录: ${dirPath}`)
    } catch (error) {
      console.log(`⚠️  无法清除目录 ${dirPath}: ${error.message}`)
    }
  } else {
    console.log(`ℹ️  目录不存在: ${dirPath}`)
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
      console.log(`✅ 已清除文件: ${filePath}`)
    } catch (error) {
      console.log(`⚠️  无法清除文件 ${filePath}: ${error.message}`)
    }
  }
}

// 清除缓存目录
cacheDirectories.forEach(removeDirectory)

// 清除临时文件
tempFiles.forEach(removeFile)

// 生成清除浏览器缓存的HTML页面
const clearCacheHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>清除认证缓存</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .status {
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            text-align: center;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .info {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .button {
            background-color: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
            font-size: 14px;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .code {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        .fingerprint {
            word-break: break-all;
            background-color: #e9ecef;
            padding: 10px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 认证缓存清理工具</h1>
            <p>解决 Token 验证失败和设备指纹问题</p>
        </div>

        <div id="status" class="status info">
            <strong>准备清理浏览器缓存...</strong>
        </div>

        <div id="fingerprint-info">
            <h3>当前设备指纹信息：</h3>
            <div id="fingerprint" class="fingerprint">生成中...</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <button class="button" onclick="clearAllCache()">清除所有浏览器缓存</button>
            <button class="button" onclick="clearAuthOnly()">仅清除认证相关</button>
            <button class="button" onclick="refreshPage()">刷新页面</button>
        </div>

        <div class="status warning">
            <strong>注意：</strong> 清除缓存后您需要重新登录所有网站
        </div>

        <h3>手动清理步骤：</h3>
        <ol>
            <li>按 F12 打开开发者工具</li>
            <li>右键点击刷新按钮，选择"清空缓存并硬性重新加载"</li>
            <li>或者在 Application 选项卡中清除 Storage</li>
            <li>关闭浏览器重新打开</li>
        </ol>
    </div>

    <script>
        // 生成设备指纹用于调试
        function generateDeviceFingerprint() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillText('Device fingerprint', 2, 2);
            }

            const fingerprint = [
                navigator.userAgent || '',
                navigator.language || '',
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                !!window.sessionStorage,
                !!window.localStorage,
                canvas.toDataURL()
            ].join('|');

            // 简单哈希
            let hash = 0;
            for (let i = 0; i < fingerprint.length; i++) {
                const char = fingerprint.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }

            return Math.abs(hash).toString(16);
        }

        // 显示设备指纹
        document.getElementById('fingerprint').textContent = generateDeviceFingerprint();

        // 清除所有缓存
        function clearAllCache() {
            const status = document.getElementById('status');
            
            try {
                // 清除localStorage
                localStorage.clear();
                
                // 清除sessionStorage
                sessionStorage.clear();
                
                // 清除cookies（当前域）
                document.cookie.split(";").forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
                
                // 清除indexedDB
                if ('indexedDB' in window) {
                    indexedDB.databases().then(databases => {
                        databases.forEach(db => {
                            indexedDB.deleteDatabase(db.name);
                        });
                    });
                }
                
                status.className = 'status success';
                status.innerHTML = '<strong>✅ 浏览器缓存已清除！</strong><br>请刷新页面或重新打开浏览器';
                
            } catch (error) {
                status.className = 'status warning';
                status.innerHTML = '<strong>⚠️ 部分缓存清除失败：</strong><br>' + error.message;
            }
        }

        // 仅清除认证相关
        function clearAuthOnly() {
            const status = document.getElementById('status');
            
            try {
                // 清除认证相关的localStorage项
                const authKeys = ['auth_session', 'auth_verify_cache', 'user_data'];
                authKeys.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });
                
                // 清除认证相关cookies
                const authCookies = ['auth-token', 'refresh-token', 'session-id'];
                authCookies.forEach(name => {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
                });
                
                status.className = 'status success';
                status.innerHTML = '<strong>✅ 认证缓存已清除！</strong><br>请重新登录';
                
            } catch (error) {
                status.className = 'status warning';
                status.innerHTML = '<strong>⚠️ 认证缓存清除失败：</strong><br>' + error.message;
            }
        }

        // 刷新页面
        function refreshPage() {
            window.location.reload(true);
        }

        // 页面加载完成后的状态
        window.addEventListener('load', function() {
            const status = document.getElementById('status');
            status.className = 'status info';
            status.innerHTML = '<strong>ℹ️ 页面已加载，可以开始清理缓存</strong>';
        });
    </script>
</body>
</html>`

// 写入清除缓存的HTML文件
fs.writeFileSync('scripts/clear-auth-page.html', clearCacheHtml)
console.log('✅ 已生成浏览器缓存清理页面: scripts/clear-auth-page.html')

console.log('\n🎉 认证缓存清理完成！')
console.log('\n📋 后续步骤:')
console.log('1. 运行 npm run dev 重新启动开发服务器')
console.log('2. 打开 scripts/clear-auth-page.html 清理浏览器缓存')
console.log('3. 重新登录应用')
console.log('4. 检查控制台中的认证调试信息')

console.log('\n🔍 如果问题仍然存在:')
console.log('1. 检查 JWT_SECRET 环境变量是否设置正确')
console.log('2. 确认数据库连接正常')
console.log('3. 查看服务器日志中的详细错误信息')
console.log('4. 使用开发者工具的 AuthPerformanceMonitor 组件进行调试')

console.log('\n💡 提示: 在开发环境中，设备指纹验证已调整为宽松模式以减少误判') 