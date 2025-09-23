const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

// 使用加密安全的随机生成器生成强密码
function generateStrongPassword(length = 20) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{};:,.?';
  const all = uppercase + lowercase + digits + symbols;

  const pick = (set) => set[crypto.randomInt(0, set.length)];

  // 至少包含 1 个大写、1 个小写、1 个数字、1 个符号
  const required = [pick(uppercase), pick(lowercase), pick(digits), pick(symbols)];
  const remainingLength = Math.max(0, length - required.length);

  const chars = [...required];
  for (let i = 0; i < remainingLength; i++) {
    chars.push(pick(all));
  }

  // Fisher–Yates 打乱，使用加密随机源
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

async function main() {
  console.log('🚀 开始初始化数据库...');

  try {
    // 检查数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 如已存在 admin 用户则跳过创建
    const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('ℹ️  已检测到管理员账户 admin，跳过创建');
      console.log('🎉 数据库初始化完成！');
      return;
    }

    // 生成随机强密码并创建管理员
    const adminPassword = generateStrongPassword(20);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
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

    // 将凭据写入文件（若提供环境变量）
    const outputFile = process.env.ADMIN_PASSWORD_FILE;
    if (outputFile) {
      try {
        const dir = path.dirname(outputFile);
        fs.mkdirSync(dir, { recursive: true });
        const content = `username=admin\npassword=${adminPassword}\n`;
        fs.writeFileSync(outputFile, content, { mode: 0o600 });
        try { fs.chmodSync(outputFile, 0o600); } catch (_) {}
        console.log(`🔐 管理员凭据已写入: ${outputFile}`);
      } catch (err) {
        console.warn('⚠️  管理员凭据写入文件失败:', err.message);
      }
    }

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