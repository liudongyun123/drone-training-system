const cloud = require('tcb-admin-node')
cloud.init({ env: 'rcwljy-5ghmq2ex26764978' })
const db = cloud.database()

exports.main = async (event) => {
  const results = []
  
  // 1. 查询管理员
  try {
    const users = await db.collection('users').where({ username: 'admin' }).limit(1).get()
    results.push('users查询: ' + JSON.stringify(users.data?.map(u => ({id:u._id, username:u.username, role:u.role, password:u.password}))))
  } catch(e) { results.push('users错误: ' + e.message) }
  
  // 2. 测试sessions集合
  try {
    const s = await db.collection('sessions').limit(1).get()
    results.push('sessions存在: ' + s.data.length + '条')
  } catch(e) { results.push('sessions不存在: ' + e.message) }
  
  // 3. 测试add
  try {
    const r = await db.collection('sessions').add({ data: { token: 'test', userId: 'test', expireAt: Date.now(), platform: 'test', createdAt: new Date().toISOString() } })
    results.push('sessions add成功: ' + r.id)
    await db.collection('sessions').doc(r.id).remove()
  } catch(e) { results.push('sessions add失败: ' + e.message) }
  
  return { success: true, results }
}
