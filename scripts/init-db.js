const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 生成随机强密码（只包含字母和数字）
function generateStrongPassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // 确保至少包含一个大写字母、小写字母和数字
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  
  // 生成剩余字符
  for (let i = 3; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function main() {
  console.log('🚀 开始初始化数据库...');

  try {
    // 检查数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 生成随机强密码
    const adminPassword = generateStrongPassword(16);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: hashedPassword,
        nickname: '管理员',
        email: 'admin@example.com',
        school: '示例大学',
        major: '计算机科学',
        grade: '2024',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    console.log('✅ 默认管理员用户创建成功:', adminUser.username);
    console.log('🎉 数据库初始化完成！');
    console.log('');
    console.log('默认管理员账号:');
    console.log('用户名: admin');
    console.log('密码:', adminPassword);
    console.log('⚠️  请妥善保存此密码！');
    console.log('');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 