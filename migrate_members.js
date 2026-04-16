/**
 * 数据迁移脚本：统一学员身份
 * 
 * 问题分析：
 * - members 表 ID 格式：student001 或 随机哈希
 * - class_members 表 studentId：student_001（下划线格式）
 * - enrollments 表 userId：student001（无下划线格式）
 * - orders 表 userId：student001 或 openid
 * 
 * 迁移策略：
 * 1. 建立 phone → memberId 映射（手机号是唯一标识）
 * 2. 更新 class_members 的 studentId → memberId
 * 3. 更新 enrollments 的 userId → memberId
 * 4. 更新 orders 的 userId → memberId
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

async function migrate() {
  console.log('🚀 开始数据迁移...\n');
  
  const db = app.database();
  
  // ========== 步骤1：获取 members 表，建立 phone → memberId 映射 ==========
  console.log('📋 步骤1：读取 members 表，建立手机号映射...');
  
  const membersResult = await db.collection('members').limit(1000).get();
  const members = membersResult.data || [];
  
  // 建立 phone → _id 映射
  const phoneToMemberId = new Map();
  // 也建立 name → _id 映射（备用）
  const nameToMemberId = new Map();
  
  members.forEach(m => {
    if (m.phone) {
      phoneToMemberId.set(m.phone, m._id);
    }
    if (m.name && m.phone) {
      nameToMemberId.set(`${m.name}_${m.phone.slice(-4)}`, m._id);
    }
  });
  
  console.log(`   - 读取 ${members.length} 条学员记录`);
  console.log(`   - 建立 ${phoneToMemberId.size} 个手机号映射\n`);
  
  // ========== 步骤2：迁移 class_members ==========
  console.log('📋 步骤2：迁移 class_members 表...');
  
  const classMembersResult = await db.collection('class_members').limit(1000).get();
  const classMembers = classMembersResult.data || [];
  console.log(`   - 待处理 ${classMembers.length} 条记录`);
  
  let classMembersUpdated = 0;
  let classMembersCreated = 0;
  let classMembersFailed = 0;
  
  for (const record of classMembers) {
    try {
      // 跳过已有 memberId 的记录
      if (record.memberId) {
        console.log(`   ⏭️  跳过（已有memberId）: ${record._id}`);
        continue;
      }
      
      let memberId = null;
      let updateData = {};
      
      // 尝试匹配
      if (record.phone && phoneToMemberId.has(record.phone)) {
        memberId = phoneToMemberId.get(record.phone);
        updateData = { memberId };
      } else if (record.studentId && record.studentId.startsWith('phone_')) {
        // 处理 phone_17628157097 格式
        const phone = record.studentId.replace('phone_', '');
        if (phoneToMemberId.has(phone)) {
          memberId = phoneToMemberId.get(phone);
          updateData = { memberId };
        }
      } else if (record.studentName && record.studentId && record.studentId.length > 10) {
        // 直接用手机号作为 studentId
        if (phoneToMemberId.has(record.studentId)) {
          memberId = phoneToMemberId.get(record.studentId);
          updateData = { memberId };
        }
      }
      
      if (memberId) {
        await db.collection('class_members').doc(record._id).update(updateData);
        classMembersUpdated++;
        console.log(`   ✅ 更新: ${record._id} → ${memberId}`);
      } else {
        // 如果找不到对应的 member，创建一个
        console.log(`   ⚠️  未找到匹配: ${JSON.stringify(record)}`);
        classMembersFailed++;
      }
    } catch (err) {
      console.log(`   ❌ 失败: ${record._id} - ${err.message}`);
      classMembersFailed++;
    }
  }
  
  console.log(`   - 更新完成: ${classMembersUpdated} 成功, ${classMembersFailed} 失败\n`);
  
  // ========== 步骤3：迁移 enrollments ==========
  console.log('📋 步骤3：迁移 enrollments 表...');
  
  const enrollmentsResult = await db.collection('enrollments').limit(1000).get();
  const enrollments = enrollmentsResult.data || [];
  console.log(`   - 待处理 ${enrollments.length} 条记录`);
  
  let enrollmentsUpdated = 0;
  let enrollmentsFailed = 0;
  
  for (const record of enrollments) {
    try {
      if (record.memberId) {
        continue;
      }
      
      let memberId = null;
      
      // 尝试不同的匹配方式
      if (record.userId && phoneToMemberId.has(record.userId)) {
        memberId = phoneToMemberId.get(record.userId);
      } else if (record.userId && record.userId.includes('_')) {
        // 处理 student_001 格式 → 转换为 student001
        const normalized = record.userId.replace('_', '');
        if (phoneToMemberId.has(normalized)) {
          memberId = phoneToMemberId.get(normalized);
        }
      }
      
      if (memberId) {
        await db.collection('enrollments').doc(record._id).update({ memberId });
        enrollmentsUpdated++;
        console.log(`   ✅ 更新: ${record._id} → ${memberId}`);
      } else {
        enrollmentsFailed++;
        if (enrollmentsFailed <= 5) {
          console.log(`   ⚠️  未找到匹配: userId=${record.userId}, name=${record.userName}`);
        }
      }
    } catch (err) {
      enrollmentsFailed++;
      console.log(`   ❌ 失败: ${record._id} - ${err.message}`);
    }
  }
  
  console.log(`   - 更新完成: ${enrollmentsUpdated} 成功, ${enrollmentsFailed} 失败\n`);
  
  // ========== 步骤4：迁移 orders ==========
  console.log('📋 步骤4：迁移 orders 表...');
  
  const ordersResult = await db.collection('orders').limit(1000).get();
  const orders = ordersResult.data || [];
  console.log(`   - 待处理 ${orders.length} 条记录`);
  
  let ordersUpdated = 0;
  let ordersFailed = 0;
  
  for (const record of orders) {
    try {
      if (record.memberId) {
        continue;
      }
      
      let memberId = null;
      
      if (record.userId && phoneToMemberId.has(record.userId)) {
        memberId = phoneToMemberId.get(record.userId);
      } else if (record.userId && record.userId.includes('_')) {
        const normalized = record.userId.replace('_', '');
        if (phoneToMemberId.has(normalized)) {
          memberId = phoneToMemberId.get(normalized);
        }
      }
      
      if (memberId) {
        await db.collection('orders').doc(record._id).update({ memberId });
        ordersUpdated++;
        console.log(`   ✅ 更新: ${record._id} → ${memberId}`);
      } else {
        ordersFailed++;
        if (ordersFailed <= 5) {
          console.log(`   ⚠️  未找到匹配: userId=${record.userId}`);
        }
      }
    } catch (err) {
      ordersFailed++;
      console.log(`   ❌ 失败: ${record._id} - ${err.message}`);
    }
  }
  
  console.log(`   - 更新完成: ${ordersUpdated} 成功, ${ordersFailed} 失败\n`);
  
  // ========== 步骤5：汇总报告 ==========
  console.log('='.repeat(50));
  console.log('📊 迁移完成汇总');
  console.log('='.repeat(50));
  console.log(`class_members: ${classMembersUpdated} 更新, ${classMembersFailed} 失败`);
  console.log(`enrollments:   ${enrollmentsUpdated} 更新, ${enrollmentsFailed} 失败`);
  console.log(`orders:        ${ordersUpdated} 更新, ${ordersFailed} 失败`);
  console.log('='.repeat(50));
  console.log('\n✅ 数据迁移完成！');
}

// 执行迁移
migrate().catch(console.error);
