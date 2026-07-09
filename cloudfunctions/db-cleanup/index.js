/**
 * db-cleanup 云函数 - 清理测试数据 + 迁移真实用户
 * 
 * 功能：
 * 1. 删除 members 集合中的测试数据
 * 2. 将 users 集合中的真实用户（非测试）迁移到 members
 * 3. 返回清理统计
 */

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command

// 测试数据特征
const TEST_PHONE_PREFIXES = ['139000000', '139100000', '139001390'] // 假手机号前缀
const TEST_OPENID = 'admin_system'

/**
 * 判断是否为测试数据
 */
function isTestData(member) {
  // 1. _openid 是 admin_system 的就是测试数据
  if (member._openid === TEST_OPENID || member._openid === 'admin_openid') return true
  
  // 2. 手机号是假的就是测试数据
  for (const prefix of TEST_PHONE_PREFIXES) {
    if (member.phone && member.phone.startsWith(prefix)) return true
  }
  
  return false
}

/**
 * 是否为真实用户（需要迁移）
 */
function isRealUser(user) {
  // 跳过测试用户
  if (user._openid === TEST_OPENID) return false
  for (const prefix of TEST_PHONE_PREFIXES) {
    if (user.phone && user.phone.startsWith(prefix)) return false
  }
  // 跳过管理员（管理员已通过登录自动迁移）
  if (user.role === 'admin') return false
  return true
}

exports.main = async (event, context) => {
  const result = {
    deletedMembers: 0,
    migratedUsers: 0,
    skippedUsers: 0,
    errors: []
  }

  try {
    // ========== 步骤1：清理 members 中的测试数据 ==========
    console.log('[db-cleanup] 步骤1：清理测试数据...')
    
    let hasMore = true
    let cursor = null
    
    while (hasMore) {
      const q = cursor 
        ? db.collection('members').limit(100).get()
        : db.collection('members').limit(100).get()
      
      // 兼容分页
      let query = db.collection('members').limit(100)
      if (cursor) {
        query = query.where({ _id: _.gt(cursor) })
      }
      
      const members = await query.orderBy('_id', 'asc').get()
      
      if (!members.data || members.data.length === 0) {
        hasMore = false
        break
      }
      
      for (const member of members.data) {
        if (isTestData(member)) {
          try {
            await db.collection('members').doc(member._id).remove()
            result.deletedMembers++
            console.log(`[db-cleanup] 删除测试数据: ${member.name} (${member._id})`)
          } catch (e) {
            result.errors.push(`删除失败 ${member._id}: ${e.message}`)
          }
        }
      }
      
      cursor = members.data[members.data.length - 1]._id
      if (members.data.length < 100) hasMore = false
    }

    console.log(`[db-cleanup] 步骤1完成：删除了 ${result.deletedMembers} 条测试数据`)

    // ========== 步骤2：迁移 users 中的真实用户到 members ==========
    console.log('[db-cleanup] 步骤2：迁移真实用户...')
    
    hasMore = true
    cursor = null
    
    while (hasMore) {
      let query = db.collection('users').limit(100)
      if (cursor) {
        query = query.where({ _id: _.gt(cursor) })
      }
      
      const users = await query.orderBy('_id', 'asc').get()
      
      if (!users.data || users.data.length === 0) {
        hasMore = false
        break
      }
      
      for (const user of users.data) {
        if (!isRealUser(user)) {
          result.skippedUsers++
          continue
        }
        
        // 检查 members 中是否已存在（按手机号或 openid）
        const existingByPhone = user.phone 
          ? await db.collection('members').where({ phone: user.phone }).limit(1).get()
          : { data: [] }
        
        const existingByOpenid = user.openid
          ? await db.collection('members').where({ openid: user.openid }).limit(1).get()
          : { data: [] }
        
        if (existingByPhone.data.length > 0 || existingByOpenid.data.length > 0) {
          console.log(`[db-cleanup] 用户已存在于 members，跳过: ${user.username || user.phone}`)
          result.skippedUsers++
          continue
        }
        
        // 创建到 members
        const now = new Date().toISOString()
        const nameSuffix = user.phone 
          ? user.phone.slice(-4) 
          : user.openid 
            ? user.openid.slice(-6) 
            : user._id.slice(-6)
        const defaultName = user.openid ? `微信用户${user.openid.slice(-6)}` : `用户${nameSuffix}`
        const member = {
          name: user.username || user.name || defaultName,
          phone: user.phone || '',
          openid: user.openid || '',
          password: user.password || '',
          role: user.role || 'student',
          status: user.status || 'active',
          loginType: user.loginType || 'phone',
          source: 'online_purchase',
          type: user.role === 'admin' ? 'user' : 'user',
          profile: {},
          stats: { totalHours: 0, completedCourses: 0, examAttempts: 0, totalOrders: 0, totalSpent: 0 },
          enrolledCourses: [],
          completedCourses: [],
          createdAt: user.createdAt || now,
          updatedAt: now,
          lastLoginAt: user.lastLoginAt || now
        }
        
        try {
          await db.collection('members').add(member)
          result.migratedUsers++
          console.log(`[db-cleanup] 迁移用户: ${member.name} (${member.phone})`)
        } catch (e) {
          result.errors.push(`迁移失败 ${user.username}: ${e.message}`)
        }
      }
      
      cursor = users.data[users.data.length - 1]._id
      if (users.data.length < 100) hasMore = false
    }
    
    console.log(`[db-cleanup] 步骤2完成：迁移了 ${result.migratedUsers} 个用户`)

    // ========== 步骤3：修复名称为"用户"的已有成员 ==========
    console.log('[db-cleanup] 步骤3：修复同名成员名称...')
    let fixedNames = 0
    
    hasMore = true
    cursor = null
    
    while (hasMore) {
      let query = db.collection('members').where({ name: '用户' }).limit(100)
      if (cursor) {
        query = db.collection('members').where({ name: '用户', _id: _.gt(cursor) })
      } else {
        query = db.collection('members').where({ name: '用户' })
      }
      
      const members = await query.orderBy('_id', 'asc').limit(100).get()
      
      if (!members.data || members.data.length === 0) {
        hasMore = false
        break
      }
      
      for (const member of members.data) {
        const newName = member.openid
          ? `微信用户${member.openid.slice(-6)}`
          : member.phone
            ? `用户${member.phone.slice(-4)}`
            : `用户${member._id.slice(-6)}`
        
        if (newName === '用户') {
          cursor = members.data[members.data.length - 1]._id
          continue // 跳过没有可区分信息的
        }
        
        try {
          await db.collection('members').doc(member._id).update({ name: newName })
          fixedNames++
          console.log(`[db-cleanup] 修复名称: 用户 → ${newName} (${member._id})`)
        } catch (e) {
          result.errors.push(`修复名称失败 ${member._id}: ${e.message}`)
        }
      }
      
      cursor = members.data[members.data.length - 1]._id
      if (members.data.length < 100) hasMore = false
    }
    
    console.log(`[db-cleanup] 步骤3完成：修复了 ${fixedNames} 个成员名称`)
    result.fixedNames = fixedNames

    return {
      success: true,
      data: result,
      message: `清理完成：删除 ${result.deletedMembers} 条测试数据，迁移 ${result.migratedUsers} 个真实用户，修复 ${fixedNames} 个名称，跳过 ${result.skippedUsers} 个`
    }
  } catch (error) {
    console.error('[db-cleanup] 错误:', error)
    return {
      success: false,
      error: error.message,
      partial: result
    }
  }
}
