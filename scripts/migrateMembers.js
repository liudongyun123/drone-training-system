/**
 * 数据迁移脚本：将 user_profiles 迁移到 members 集合
 * 
 * 运行方式：
 *   node scripts/migrateMembers.js
 * 
 * 或者在浏览器控制台中复制执行
 */

const { app } = require('./src/utils/cloudbase')

async function migrateToMembers() {
  console.log('🚀 开始迁移数据到 members 集合...\n')
  
  const db = app.database()
  const membersCollection = db.collection('members')
  const profilesCollection = db.collection('user_profiles')
  
  try {
    // 1. 获取所有 user_profiles 数据
    console.log('📋 获取 user_profiles 数据...')
    const profilesRes = await profilesCollection.get()
    const profiles = profilesRes.data || []
    console.log(`   找到 ${profiles.length} 条用户档案\n`)
    
    if (profiles.length === 0) {
      console.log('⚠️  没有需要迁移的数据')
      return
    }
    
    // 2. 迁移每个档案到 members
    let successCount = 0
    let skipCount = 0
    
    for (const profile of profiles) {
      try {
        // 检查是否已存在于 members
        const existing = await membersCollection.doc(profile.userId || profile._id).get()
        
        if (existing.data) {
          console.log(`   ⏭️  跳过已存在: ${profile.name} (${profile.userId})`)
          skipCount++
          continue
        }
        
        // 创建 members 记录
        const member = {
          _id: profile.userId || profile._id,
          name: profile.name || '未知用户',
          phone: profile.phone,
          email: profile.email,
          avatar: profile.avatar,
          type: 'student',  // 档案中的用户视为正式学员
          role: 'student',
          profile: {
            idCard: profile.idCard,
            gender: profile.gender,
            address: profile.address,
            education: profile.education,
            emergencyContact: profile.emergencyContact,
            emergencyPhone: profile.emergencyPhone,
            level: profile.level,
            totalHours: profile.totalHours || 0
          },
          stats: {
            totalHours: profile.totalHours || 0,
            completedCourses: 0,
            examAttempts: 0,
            avgScore: 0,
            totalOrders: 0,
            totalSpent: 0
          },
          enrolledCourses: [],
          completedCourses: [],
          status: profile.status || 'active',
          createdAt: profile.joinDate || profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          firstPurchaseAt: profile.joinDate
        }
        
        await membersCollection.add(member)
        console.log(`   ✅ 迁移成功: ${profile.name} (${profile.userId})`)
        successCount++
      } catch (err) {
        console.error(`   ❌ 迁移失败: ${profile.name}`, err.message)
      }
    }
    
    console.log('\n📊 迁移完成！')
    console.log(`   成功: ${successCount}`)
    console.log(`   跳过: ${skipCount}`)
    console.log(`   总计: ${profiles.length}`)
    
    // 3. 创建索引（可选）
    console.log('\n📝 建议在 CloudBase 控制台为 members 集合创建以下索引：')
    console.log('   - type (普通索引)')
    console.log('   - phone (普通索引)')
    console.log('   - enrolledCourses (数组索引)')
    console.log('   - createdAt (降序索引)')
    
  } catch (error) {
    console.error('\n❌ 迁移过程出错:', error)
  }
}

// 运行迁移
migrateToMembers()
