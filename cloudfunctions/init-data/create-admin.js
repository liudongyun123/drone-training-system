const cloud = require('tcb-admin-node')
cloud.init({ env: 'rcwljy-5ghmq2ex26764978' })
const db = cloud.database()

exports.main = async () => {
  try {
    // 检查是否已存在
    const exist = await db.collection('users').where({ username: 'admin' }).limit(1).get()
    
    if (exist.data && exist.data.length > 0) {
      console.log('管理员已存在，更新密码')
      await db.collection('users').doc(exist.data[0]._id).update({
        password: 'admin123',
        role: 'admin',
        status: 'active',
        phone: '17628157097'
      })
      return { code: 0, message: '管理员已更新', id: exist.data[0]._id }
    }
    
    // 创建新管理员
    const now = new Date().toISOString()
    const result = await db.collection('users').add({
      data: {
        username: 'admin',
        password: 'admin123',
        phone: '17628157097',
        name: '系统管理员',
        avatar: '',
        role: 'admin',
        status: 'active',
        permissions: ['admin:all'],
        createdAt: now,
        updatedAt: now
      }
    })
    
    console.log('管理员创建成功:', result.id)
    return { code: 0, message: '管理员创建成功', id: result.id }
  } catch (e) {
    console.error('创建管理员失败:', e)
    return { code: -1, message: e.message }
  }
}
