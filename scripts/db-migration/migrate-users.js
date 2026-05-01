/**
 * 数据迁移脚本: 合并 members + students + user_profiles → users
 * 
 * 使用方式:
 * 1. 在 CloudBase 控制台运行，或
 * 2. 本地 node migrate-users.js（需配置 cloudbase-node-sdk）
 */

const cloud = require('tcb-admin-node')

cloud.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = cloud.database()
const _ = db.command

async function migrateUsers() {
  console.log('开始迁移用户数据...\n')

  // 1. 获取所有 members
  console.log('读取 members...')
  const members = await getAllRecords('members')
  console.log(`  找到 ${members.length} 条记录`)

  // 2. 获取所有 students（小程序用户）
  console.log('读取 students...')
  const students = await getAllRecords('students')
  console.log(`  找到 ${students.length} 条记录`)

  // 3. 获取所有 user_profiles
  console.log('读取 user_profiles...')
  const profiles = await getAllRecords('user_profiles')
  console.log(`  找到 ${profiles.length} 条记录`)

  // 4. 合并用户数据
  console.log('\n合并用户数据...')
  const usersMap = new Map()

  // 先处理 members（优先级最高）
  for (const m of members) {
    const phone = m.phone || ''
    if (!phone) continue

    usersMap.set(phone, {
      phone,
      name: m.name || m.username || '',
      avatar: m.avatar || '',
      role: mapMemberRole(m.level),
      status: 'active',
      openid: '',
      unionid: '',
      stats: {
        courseCount: 0,
        classCount: 0,
        studyHours: 0,
        examCount: 0
      },
      createdAt: m.createdAt || new Date(),
      updatedAt: m.updatedAt || new Date(),
      lastLoginAt: m.lastLoginAt
    })
  }

  // 合并 students（补充 openid）
  for (const s of students) {
    const openid = s._openid || s.openid || ''
    if (!openid) continue

    // 查找是否已有该手机号用户
    const existingUser = [...usersMap.values()].find(u => u.openid === openid)
    if (existingUser) {
      // 更新 openid
      existingUser.openid = openid
      continue
    }

    // 用 openid 作为唯一标识（可能没有手机号）
    const phone = s.phone || ''
    if (phone && usersMap.has(phone)) {
      // 更新 openid
      usersMap.get(phone).openid = openid
    } else {
      // 新用户（用 openid 作为临时标识）
      usersMap.set(`openid_${openid}`, {
        phone: phone || '',
        name: s.nickName || s.name || '',
        avatar: s.avatarUrl || s.avatar || '',
        role: 'student',
        status: 'active',
        openid,
        unionid: s.unionid || '',
        stats: {
          courseCount: 0,
          classCount: 0,
          studyHours: 0,
          examCount: 0
        },
        createdAt: s.createdAt || new Date(),
        updatedAt: new Date(),
        lastLoginAt: s.lastLoginAt
      })
    }
  }

  // 合并 user_profiles（补充信息）
  for (const p of profiles) {
    const openid = p._openid || p.openid || ''
    const phone = p.phone || ''

    // 先用 openid 查找
    let user = [...usersMap.values()].find(u => u.openid === openid)
    if (!user && phone) {
      user = usersMap.get(phone)
    }

    if (user) {
      // 补充信息
      if (!user.name && p.name) user.name = p.name
      if (!user.avatar && p.avatar) user.avatar = p.avatar
      if (p.gender) user.gender = p.gender
      if (p.idCard) user.idCard = p.idCard
    }
  }

  console.log(`合并后共 ${usersMap.size} 个用户`)

  // 5. 写入新集合
  console.log('\n写入 users 集合...')
  const users = [...usersMap.values()]
  const BATCH_SIZE = 100

  let successCount = 0
  let skipCount = 0

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)
    
    try {
      const res = await db.collection('users').add(batch)
      successCount += batch.length
      console.log(`  批次 ${Math.floor(i / BATCH_SIZE) + 1}: 写入 ${batch.length} 条`)
    } catch (e) {
      console.error(`  批次 ${Math.floor(i / BATCH_SIZE) + 1}: 失败 - ${e.message}`)
      skipCount += batch.length
    }
  }

  console.log(`\n迁移完成！`)
  console.log(`  成功: ${successCount}`)
  console.log(`  失败: ${skipCount}`)

  // 6. 创建索引（手动执行）
  console.log('\n请在 CloudBase 控制台手动创建以下索引:')
  console.log('  users.phone (unique)')
  console.log('  users.openid (unique)')
  console.log('  users.status')

  return {
    total: usersMap.size,
    success: successCount,
    failed: skipCount
  }
}

// 辅助函数：获取集合所有记录
async function getAllRecords(collection) {
  const MAX_LIMIT = 1000
  const result = []
  let skip = 0

  while (true) {
    const res = await db.collection(collection)
      .skip(skip)
      .limit(MAX_LIMIT)
      .get()
    
    result.push(...res.data)
    
    if (res.data.length < MAX_LIMIT) break
    skip += MAX_LIMIT
  }

  return result
}

// 辅助函数：会员等级映射角色
function mapMemberRole(level) {
  const levelMap = {
    'super_vip': 'admin',
    'vip': 'teacher',
    'member': 'student',
    'normal': 'student'
  }
  return levelMap[level] || 'student'
}

// 执行迁移
if (require.main === module) {
  migrateUsers()
    .then(res => console.log('结果:', res))
    .catch(err => console.error('错误:', err))
}

module.exports = { migrateUsers }
