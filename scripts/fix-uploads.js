#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 修复 uploads 目录和文件权限
 */

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

console.log('🔍 检查 uploads 目录状态...\n');

// 检查目录是否存在
if (!fs.existsSync(uploadsDir)) {
    console.log('❌ uploads 目录不存在');
    console.log('📁 正在创建 uploads 目录...');
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ uploads 目录创建成功');
    } catch (error) {
        console.error('❌ 创建目录失败:', error.message);
        process.exit(1);
    }
} else {
    console.log('✅ uploads 目录存在');
}

// 检查目录权限
try {
    const stats = fs.statSync(uploadsDir);
    const mode = stats.mode.toString(8).slice(-3);
    console.log('📂 目录权限:', mode);
    
    if (mode !== '755') {
        console.log('⚠️  建议的目录权限为 755');
        console.log('💡 请运行: chmod 755 public/uploads');
    } else {
        console.log('✅ 目录权限正确');
    }
} catch (error) {
    console.error('❌ 检查目录权限失败:', error.message);
}

// 统计文件数量和大小
try {
    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file));
    
    console.log(`\n📊 统计信息:`);
    console.log(`  总文件数: ${files.length}`);
    console.log(`  图片文件数: ${imageFiles.length}`);
    
    let totalSize = 0;
    let problemFiles = [];
    
    imageFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        try {
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            
            const mode = stats.mode.toString(8).slice(-3);
            if (mode !== '644') {
                problemFiles.push({ file, mode });
            }
        } catch (error) {
            problemFiles.push({ file, error: error.message });
        }
    });
    
    console.log(`  总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (problemFiles.length > 0) {
        console.log(`\n⚠️  发现 ${problemFiles.length} 个文件权限问题:`);
        problemFiles.forEach(({ file, mode, error }) => {
            if (error) {
                console.log(`  ❌ ${file}: ${error}`);
            } else {
                console.log(`  ⚠️  ${file}: 权限 ${mode} (建议 644)`);
            }
        });
        console.log('\n💡 建议运行: chmod 644 public/uploads/*');
    } else if (imageFiles.length > 0) {
        console.log('✅ 所有文件权限正确');
    }
    
} catch (error) {
    console.error('❌ 读取目录失败:', error.message);
}

// 检查最近上传的文件
console.log('\n📋 最近上传的文件:');
try {
    const files = fs.readdirSync(uploadsDir)
        .filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
        .map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime
            };
        })
        .sort((a, b) => b.created - a.created)
        .slice(0, 5);
    
    files.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        console.log(`  📄 ${file.name} (${sizeKB} KB) - ${file.created.toLocaleString()}`);
    });
    
} catch (error) {
    console.error('❌ 获取文件列表失败:', error.message);
}

console.log('\n🎯 修复建议:');
console.log('1. 确保目录权限: chmod 755 public/uploads');
console.log('2. 确保文件权限: chmod 644 public/uploads/*');
console.log('3. 重启应用服务器');
console.log('4. 测试图片访问: http://your-domain.com/uploads/filename.webp');

console.log('\n✨ 检查完成！'); 