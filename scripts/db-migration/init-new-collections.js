/**
 * 初始化新集合脚本
 * 
 * 创建 products, notices, messages 等新集合
 * 并为现有集合创建索引
 */

const cloud = require('tcb-admin-node')

cloud.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = cloud.database()

// 新集合定义
const NEW_COLLECTIONS = {
  // 商城商品
  products: {
    indexes: [
      { name: 'category', keys: { category: 1 } },
      { name: 'status', keys: { status: 1 } },
      { name: 'sortOrder', keys: { sortOrder: -1 } }
    ],
    sampleData: [
      {
        title: '大疆御3桨叶',
        description: '适用于Mavic 3系列无人机的原厂桨叶',
        cover: '',
        images: [],
        price: 199,
        originalPrice: 299,
        stock: 100,
        sales: 0,
        category: 'propeller',
        specs: [{ name: '长度', value: '9450' }],
        compatibleModels: ['Mavic 3', 'Mavic 3 Pro', 'Mavic 3 Classic'],
        status: 'active',
        sortOrder: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: '智能飞行电池',
        description: '大疆原厂智能电池，适用于御3系列',
        cover: '',
        images: [],
        price: 799,
        originalPrice: 999,
        stock: 50,
        sales: 0,
        category: 'battery',
        specs: [{ name: '容量', value: '5000mAh' }],
        compatibleModels: ['Mavic 3', 'Mavic 3 Pro'],
        status: 'active',
        sortOrder: 90,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },

  // 公告
  notices: {
    indexes: [
      { name: 'type', keys: { type: 1 } },
      { name: 'status', keys: { status: 1 } },
      { name: 'isPinned', keys: { isPinned: -1, publishedAt: -1 } }
    ],
    sampleData: [
      {
        title: '平台上线公告',
        content: '<p>欢迎使用无人机培训平台！</p>',
        type: 'system',
        isPinned: true,
        status: 'published',
        viewCount: 0,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },

  // 消息
  messages: {
    indexes: [
      { name: 'userId_isRead', keys: { userId: 1, isRead: 1 } },
      { name: 'userId_createdAt', keys: { userId: 1, createdAt: -1 } }
    ],
    sampleData: []
  },

  // 用户表（新）
  users: {
    indexes: [
      { name: 'phone_unique', keys: { phone: 1 }, unique: true },
      { name: 'openid_unique', keys: { openid: 1 }, unique: true },
      { name: 'status', keys: { status: 1 } }
    ],
    sampleData: []
  }
}

async function initCollections() {
  console.log('开始初始化新集合...\n')

  // 1. 获取现有集合列表
  const existingCollections = await getCollections()
  console.log('现有集合:', existingCollections.join(', '), '\n')

  // 2. 创建新集合
  for (const [name, config] of Object.entries(NEW_COLLECTIONS)) {
    if (existingCollections.includes(name)) {
      console.log(`集合 ${name} 已存在，跳过创建`)
      continue
    }

    try {
      // 创建集合
      await db.createCollection(name)
      console.log(`✅ 创建集合: ${name}`)

      // 插入示例数据
      if (config.sampleData && config.sampleData.length > 0) {
        await db.collection(name).add(config.sampleData)
        console.log(`   插入 ${config.sampleData.length} 条示例数据`)
      }
    } catch (e) {
      console.error(`❌ 创建集合 ${name} 失败:`, e.message)
    }
  }

  // 3. 打印索引创建命令
  console.log('\n请在 CloudBase 控制台手动创建以下索引:\n')
  for (const [name, config] of Object.entries(NEW_COLLECTIONS)) {
    if (config.indexes && config.indexes.length > 0) {
      console.log(`\n【${name}】`)
      for (const idx of config.indexes) {
        const uniqueStr = idx.unique ? ' (unique)' : ''
        console.log(`  - ${idx.name}${uniqueStr}: ${JSON.stringify(idx.keys)}`)
      }
    }
  }

  console.log('\n\n✅ 初始化完成！')
}

async function getCollections() {
  try {
    const res = await db.listCollections()
    return res.result?.collections?.map(c => c.name) || []
  } catch (e) {
    console.error('获取集合列表失败:', e.message)
    return []
  }
}

if (require.main === module) {
  initCollections().catch(err => console.error('错误:', err))
}

module.exports = { initCollections, NEW_COLLECTIONS }
