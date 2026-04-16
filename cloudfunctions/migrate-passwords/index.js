/**
 * 密码迁移云函数
 * 将数据库中明文密码迁移为bcrypt加密格式
 */

const cloudbase = require('@cloudbase/node-sdk')
const bcrypt = require('bcryptjs')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event
  
  console.log('密码迁移请求:', { action })
  
  try {
    switch (action) {
      case 'migrate':
        return await migratePasswords()
      case 'check':
        return await checkPasswords()
      default:
        return {
          code: 400,
          message: `未知的操作类型: ${action}`
        }
    }
  } catch (error) {
    console.error('密码迁移失败:', error)
    return {
      code: 500,
      message: error.message || '操作失败',
      error: error
    }
  }
}

/**
 * 迁移明文密码为加密格式
 */
async function migratePasswords() {
  console.log('开始密码迁移...')
  
  // 获取所有用户
  const result = await db.collection('users').get()
  const users = result.data
  
  console.log(`找到 ${users.length} 个用户`)
  
  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0
  const errors = []
  
  for (const user of users) {
    try {
      // 检查密码是否已加密
      if (!user.password) {
        console.log(`用户 ${user.username || user._id} 没有密码，跳过`)
        skippedCount++
        continue
      }
      
      // 检查是否已经是bcrypt格式
      if (user.password.startsWith('$2a$') || 
          user.password.startsWith('$2b$') || 
          user.password.startsWith('$2y$')) {
        console.log(`用户 ${user.username || user._id} 密码已加密，跳过`)
        skippedCount++
        continue
      }
      
      // 加密密码
      const salt = bcrypt.genSaltSync(10)
      const hashedPassword = bcrypt.hashSync(user.password, salt)
      
      // 更新用户密码
      await db.collection('users').doc(user._id).update({
        password: hashedPassword,
        passwordMigratedAt: new Date().toISOString(),
        passwordVersion: 'bcrypt'
      })
      
      console.log(`用户 ${user.username || user._id} 密码迁移成功`)
      migratedCount++
      
    } catch (error) {
      console.error(`用户 ${user.username || user._id} 密码迁移失败:`, error)
      errors.push({
        userId: user._id,
        username: user.username,
        error: error.message
      })
      errorCount++
    }
  }
  
  console.log('密码迁移完成:', { migratedCount, skippedCount, errorCount })
  
  return {
    code: 0,
    message: '密码迁移完成',
    data: {
      total: users.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors
    }
  }
}

/**
 * 检查密码状态
 */
async function checkPasswords() {
  console.log('检查密码状态...')
  
  const result = await db.collection('users').get()
  const users = result.data
  
  let encryptedCount = 0
  let plaintextCount = 0
  let emptyCount = 0
  
  for (const user of users) {
    if (!user.password) {
      emptyCount++
    } else if (user.password.startsWith('$2a$') || 
               user.password.startsWith('$2b$') || 
               user.password.startsWith('$2y$')) {
      encryptedCount++
    } else {
      plaintextCount++
    }
  }
  
  return {
    code: 0,
    message: '密码状态检查完成',
    data: {
      total: users.length,
      encrypted: encryptedCount,
      plaintext: plaintextCount,
      empty: emptyCount,
      migrationNeeded: plaintextCount > 0
    }
  }
}
