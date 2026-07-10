/**
 * db-init 云函数 - 统一数据库操作
 * 支持 MongoDB 风格操作符（$eq/$gt/$lt/$in/$regex/$or/$and 等）
 * 支持 UPDATE 操作符（$inc/$addToSet/$push/$pull 等）
 */

'use strict';

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command;

// ==================== MongoDB 风格操作符转换 ====================

/**
 * 将 MongoDB 风格查询条件转换为 CloudBase db.command 对象
 * 
 * 支持的操作符：
 *   $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
 *   $regex (值格式: { $regex: 'pattern', $options: 'i' } 或直接 'pattern')
 *   $or: [{ field: value }, ...]
 *   $and: [{ field: value }, ...]
 *   $exists: boolean
 *   $elemMatch: { field: value, ... }
 *   $size: number
 * 
 * 示例输入：{ status: { $in: ['paid', 'completed'] }, price: { $gte: 100 } }
 * 转换为：_.and(_.or([{status: _.in(['paid','completed'])}]), {price: _.gte(100)})
 */
function convertQueryOperators(conditions) {
  if (!conditions || typeof conditions !== 'object') return conditions;
  if (Array.isArray(conditions)) {
    return conditions.map(item => convertQueryOperators(item));
  }
  
  const result = {};
  let hasComplexOp = false;
  const complexConditions = [];
  
  for (const [key, value] of Object.entries(conditions)) {
    if (key === '$and') {
      // $and: [{field: value}, ...]
      const andConditions = Array.isArray(value) 
        ? value.map(v => convertQueryOperators(v))
        : [];
      complexConditions.push(_.and(...andConditions));
      hasComplexOp = true;
    } else if (key === '$or') {
      // $or: [{field: value}, ...]
      const orConditions = Array.isArray(value)
        ? value.map(v => convertQueryOperators(v))
        : [];
      complexConditions.push(_.or(...orConditions));
      hasComplexOp = true;
    } else if (key === '$nor') {
      const norConditions = Array.isArray(value)
        ? value.map(v => convertQueryOperators(v))
        : [];
      complexConditions.push(_.nor(...norConditions));
      hasComplexOp = true;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // 检查是否是操作符对象 { $gt: 10, $lt: 20 }
      const operators = value;
      const opKeys = Object.keys(operators);
      const isOperatorObj = opKeys.some(k => k.startsWith('$'));
      
      if (isOperatorObj) {
        // 可能有多个操作符组合，如 { $gte: 10, $lte: 20 }
        // 需要转换为 _.and(key.gte(10), key.lte(20))
        const fieldConditions = [];
        for (const [op, opVal] of Object.entries(operators)) {
          const cmd = convertSingleOperator(key, op, opVal);
          if (cmd) fieldConditions.push(cmd);
        }
        if (fieldConditions.length === 1) {
          complexConditions.push(fieldConditions[0]);
        } else if (fieldConditions.length > 1) {
          complexConditions.push(_.and(...fieldConditions));
        }
        hasComplexOp = true;
      } else if (opKeys.some(k => k.includes('.'))) {
        // 点号路径值（嵌套对象的子路径条件），直接放入 result
        result[key] = value;
      } else {
        // 普通嵌套对象，如 { profile: { name: 'xx' } }
        // 直接放入 result（CloudBase 支持嵌套对象精确匹配）
        result[key] = value;
      }
    } else {
      // 简单值，直接设置
      result[key] = value;
    }
  }
  
  if (hasComplexOp && Object.keys(result).length === 0) {
    // 全部是复杂操作符
    return _.and(...complexConditions);
  }
  
  if (hasComplexOp) {
    // 混合简单条件和复杂操作符
    complexConditions.push(result);
    return _.and(...complexConditions);
  }
  
  return result;
}

/**
 * 转换单个操作符
 */
function convertSingleOperator(field, op, value) {
  switch (op) {
    case '$eq':   return { [field]: _.eq(value) };
    case '$ne':   return { [field]: _.neq(value) };
    case '$gt':   return { [field]: _.gt(value) };
    case '$gte':  return { [field]: _.gte(value) };
    case '$lt':   return { [field]: _.lt(value) };
    case '$lte':  return { [field]: _.lte(value) };
    case '$in':   return { [field]: _.in(value) };
    case '$nin':  return { [field]: _.nin(value) };
    case '$regex': {
      const options = typeof value === 'object' ? (value.$options || '') : '';
      const pattern = typeof value === 'object' ? (value.$regex || value.pattern || '') : String(value);
      return { [field]: db.RegExp({ regexp: pattern, options }) };
    }
    case '$exists': return { [field]: _.exists(value) };
    case '$all':  return { [field]: _.all(value) };
    case '$size': return { [field]: _.size(value) };
    case '$elemMatch': {
      // $elemMatch: { field: value }
      const matchConditions = convertQueryOperators(value);
      return { [field]: _.elemMatch(matchConditions) };
    }
    default:
      console.warn('[db-init] 未知操作符:', op, '-> 忽略');
      return null;
  }
}

/**
 * 转换 UPDATE 操作符
 * 支持: $inc, $set, $addToSet, $push, $pull, $pullAll, $unset, $mul, $min, $max, $rename
 * 
 * 示例输入: { name: 'newName', '$inc': { count: 1 }, '$addToSet': { tags: 'hot' } }
 * 转换为: { name: 'newName', count: _.inc(1), tags: _.addToSet(['hot']) }
 */
function convertUpdateOperators(data) {
  if (!data || typeof data !== 'object') return data;
  
  const simpleFields = {};
  const operatorFields = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$')) {
      // 操作符
      const op = key;
      if (typeof value === 'object' && value !== null) {
        for (const [field, fieldValue] of Object.entries(value)) {
          operatorFields[field] = convertSingleUpdateOperator(op, fieldValue);
        }
      }
    } else {
      // 简单字段
      simpleFields[key] = value;
    }
  }
  
  // 合并简单字段和操作符字段
  return { ...simpleFields, ...operatorFields };
}

function convertSingleUpdateOperator(op, value) {
  switch (op) {
    case '$inc': return _.inc(value);
    case '$mul': return _.mul(value);
    case '$min': return _.min(value);
    case '$max': return _.max(value);
    case '$addToSet': return _.addToSet(value);
    case '$push': return _.push(value);
    case '$pull': return _.pull(value);
    case '$pullAll': return _.pullAll(value);
    case '$unset': return _.remove();
    case '$rename': return value; // CloudBase 不直接支持 rename，忽略
    default:
      console.warn('[db-init] 未知更新操作符:', op);
      return value;
  }
}

/**
 * 将点号表示法转换为嵌套对象
 */
function convertDotNotation(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key.includes('.') && typeof obj[key] !== 'object') {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = obj[key];
      } else if (key.includes('.') && typeof obj[key] === 'object' && obj[key] !== null) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = obj[key];
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

// 主入口
exports.main = async (event, context) => {
  console.log('[db-init] 收到请求:', JSON.stringify(event));
  
  try {
    // 解析参数
    let params = event;
    
    // HTTP 触发器格式处理
    if (event.httpMethod) {
      try {
        const body = event.body || '{}';
        params = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (e) {
        console.error('[db-init] 解析body失败:', e);
        params = {};
      }
    }
    
    const { action, collection, id, data, query, where, skip, limit, orderBy, order, fileList, useOperators } = params;
    
    console.log('[db-init] action:', action, 'collection:', collection);
    
    let result;
    
    switch (action) {
      case 'ping':
        result = { code: 0, message: 'pong', timestamp: new Date().toISOString() };
        break;

      case 'createCollection': {
        // 显式创建集合（CloudBase 不会自动建集合）
        if (!collection) {
          result = { code: 400, message: '缺少 collection 参数' };
          break;
        }
        try {
          await db.createCollection(collection);
          result = { code: 0, message: `集合 ${collection} 创建成功` };
        } catch (e) {
          // 已存在时也会报错，视为成功
          result = { code: 0, message: `集合 ${collection} 已存在或创建完成`, detail: e.message };
        }
        break;
      }

      case 'query':
      case 'getList': {
        const rawConditions = query || where || {};
        // 支持 MongoDB 风格操作符（客户端传 useOperators: true 时启用）
        const whereConditions = useOperators 
          ? convertQueryOperators(rawConditions) 
          : rawConditions;
        
        let coll = db.collection(collection);
        
        // 应用 where 条件（无论是否空对象，仅在非空条件下应用）
        const condStr = typeof whereConditions === 'object' ? JSON.stringify(whereConditions) : '';
        const hasConditions = condStr.length > 2 && condStr !== '{}';
        if (hasConditions) {
          console.log('[db-init] where 条件:', condStr.substring(0, 200));
          coll = coll.where(whereConditions);
        }
        
        const sortField = orderBy || 'createdAt';
        const sortOrder = order || 'desc';
        const pageSize = Math.min(limit || 20, 100);
        const skipCount = skip || 0;
        
        const [listResult, countResult] = await Promise.all([
          coll.orderBy(sortField, sortOrder).skip(skipCount).limit(pageSize).get(),
          coll.count()
        ]);
        
        result = {
          code: 0,
          data: listResult.data || [],
          total: countResult.total || 0,
          skip: skipCount,
          limit: pageSize
        };
        break;
      }
        
      case 'get': {
        const docResult = await db.collection(collection).doc(id).get();
        if (docResult.data && docResult.data.length > 0) {
          result = { code: 0, data: docResult.data[0] };
        } else {
          result = { code: 404, message: '记录不存在' };
        }
        break;
      }
        
      case 'add':
      case 'create': {
        const now = new Date().toISOString();
        const insertData = {
          ...data,
          createdAt: data.createdAt || now,
          updatedAt: now
        };
        
        // 所有集合统一由 CloudBase 自动生成 _id，避免冒号等特殊字符导致 doc().set() 失败
        delete insertData._id;
        // 注意：_openid 默认删除（避免误写系统字段），但证书等场景需要显式写入
        // 用户身份 _openid（如管理后台按手机号查到 openid 后颁发证书，使小程序端可按 _openid 查询），
        // 因此当调用方显式传入 _openid 时予以保留。
        if (!insertData._openid) {
          delete insertData._openid;
        }
        
        if (insertData._id) {
          // 有自定义 _id 时使用 doc().set() 创建
          await db.collection(collection).doc(insertData._id).set(insertData);
          console.log('[db-init] 使用自定义 _id 创建文档:', insertData._id);
          result = { code: 0, data: { id: insertData._id }, message: '添加成功' };
        } else {
          // @cloudbase/node-sdk 直接传入文档对象，不需要 { data: ... } 包装
          const addResult = await db.collection(collection).add(insertData);
          // 服务端 add 返回的 id 字段名可能是 id 或 _id
          const newId = addResult.id || addResult._id || '';
          result = { code: 0, data: { id: newId }, message: '添加成功' };
        }
        break;
      }
        
      case 'update': {
        // 支持 MongoDB 风格更新操作符 ($inc, $addToSet, $push 等)
        const plainData = { ...data };
        delete plainData._id;
        delete plainData._openid;
        delete plainData.createdAt;
        
        const updateData = useOperators 
          ? convertUpdateOperators(plainData)
          : plainData;
        
        // 添加更新时间
        if (typeof updateData === 'object' && !Array.isArray(updateData)) {
          updateData.updatedAt = new Date().toISOString();
        }
        
        if (useOperators) {
          // 使用操作符时，继续使用 update 方法
          const updateResult = await db.collection(collection).doc(id).update(updateData);
          result = { code: 0, updated: updateResult.updated, message: '更新成功' };
        } else {
          // 普通更新：使用 set 代替 update，避免嵌套对象导致 multiple write errors
          const docResult = await db.collection(collection).doc(id).get();
          if (!docResult.data || docResult.data.length === 0) {
            result = { code: 404, message: '记录不存在' };
            break;
          }
          
          const existingData = docResult.data[0];
          const mergedData = { ...existingData, ...updateData };
          delete mergedData._id;
          delete mergedData._openid;
          
          const updateResult = await db.collection(collection).doc(id).set(mergedData);
          result = { code: 0, updated: updateResult.updated || 1, message: '更新成功' };
        }
        break;
      }
        
      case 'delete':
      case 'remove': {
        // ★ 删除分类时，同步清理 page_configs 中 learningPaths 的关联条目
        if (collection === 'categories') {
          try {
            // 1. 先获取分类信息（需要 name 用于匹配 page_configs）
            const catResult = await db.collection('categories').doc(id).get();
            const categoryDoc = catResult.data?.[0];
            
            if (categoryDoc) {
              const categoryName = categoryDoc.name;
              const categoryId = id;
              
              // 2. 查找所有 page_configs 中 section=learningPaths 的配置
              const pageConfigResult = await db.collection('page_configs')
                .where({ section: 'learningPaths' })
                .limit(50)
                .get();
              
              const configs = pageConfigResult.data || [];
              
              // 3. 遍历每个配置，移除匹配该分类的条目
              for (const config of configs) {
                if (!config.data?.items || !Array.isArray(config.data.items)) continue;
                
                const originalCount = config.data.items.length;
                const cleanedItems = config.data.items.filter((item) => {
                  // 同时按 _id 和 name 匹配，确保能命中所有可能的关联
                  const matchById = item._id === categoryId || item.id === categoryId;
                  const matchByName = item.name === categoryName;
                  return !(matchById || matchByName);
                });
                
                const removedCount = originalCount - cleanedItems.length;
                
                if (removedCount > 0) {
                  console.log(`[db-init] 删除分类 "${categoryName}"，同步清理 page_configs "${config._id}" 中的 ${removedCount} 个关联条目`);
                  
                  if (cleanedItems.length === 0) {
                    // 没有剩余条目了，删除整个 page_config 文档
                    await db.collection('page_configs').doc(config._id).remove();
                    console.log(`[db-init] page_configs "${config._id}" 已无条目，已删除`);
                  } else {
                    // 更新 items 数组
                    await db.collection('page_configs').doc(config._id).update({
                      'data.items': cleanedItems,
                      updatedAt: new Date().toISOString()
                    });
                  }
                }
              }
            }
          } catch (syncErr) {
            // page_configs 同步失败不阻塞主删除操作
            console.error('[db-init] 同步清理 page_configs 失败:', syncErr);
          }
        }
        
        // 执行真正的删除
        const removeResult = await db.collection(collection).doc(id).remove();
        result = { code: 0, deleted: removeResult.deleted || 0, message: '删除成功' };
        break;
      }
        
      case 'count': {
        const rawConditions = query || where || {};
        const countConditions = useOperators 
          ? convertQueryOperators(rawConditions) 
          : rawConditions;
        
        let countColl = db.collection(collection);
        
        const condStr = typeof countConditions === 'object' ? JSON.stringify(countConditions) : '';
        if (condStr.length > 2 && condStr !== '{}') {
          countColl = countColl.where(countConditions);
        }
        
        const countResult = await countColl.count();
        result = { code: 0, total: countResult.total };
        break;
      }
        
      case 'getTempFileURL': {
        // 获取云存储文件的临时链接
        if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
          result = { code: 400, message: 'fileList 参数无效' };
          break;
        }
        
        try {
          console.log('[db-init] getTempFileURL fileList:', fileList);
          
          const urlResult = await app.getTempFileURL({
            fileList: fileList.map((fileId) => ({
              fileID: fileId,
              maxAge: 7 * 24 * 60 * 60 // 7天有效期
            }))
          });
          
          console.log('[db-init] getTempFileURL result:', JSON.stringify(urlResult));
          result = { code: 0, fileList: urlResult.fileList };
        } catch (err) {
          console.error('[db-init] getTempFileURL 错误:', err);
          result = { code: 500, message: err.message || '获取文件链接失败' };
        }
        break;
      }
        
      case 'proxyDownload': {
        // ★ 代理下载：后端下载云存储文件并返回 base64，绕过小程序 downloadFile 域名限制
        if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
          result = { code: 400, message: 'fileList 参数无效' };
          break;
        }
        
        const https = require('https');
        const fileId = fileList[0];
        
        try {
          // 1. 获取临时下载链接
          const urlResult = await app.getTempFileURL({
            fileList: [{ fileID: fileId, maxAge: 600 }] // 10分钟有效期
          });
          
          if (!urlResult.fileList || !urlResult.fileList[0]) {
            result = { code: 404, message: '文件不存在或已被删除' };
            break;
          }
          
          const fileInfo = urlResult.fileList[0];
          if (fileInfo.code !== 'SUCCESS') {
            result = { code: 500, message: fileInfo.message || '获取临时链接失败' };
            break;
          }
          
          const downloadUrl = fileInfo.tempFileURL || fileInfo.download_url;
          console.log('[db-init] proxyDownload URL:', downloadUrl.substring(0, 100));
          
          // 2. 后端代理下载文件内容
          const fileBuffer = await new Promise((resolve, reject) => {
            const urlObj = new URL(downloadUrl);
            https.get({
              hostname: urlObj.hostname,
              path: urlObj.pathname + urlObj.search,
              headers: { 'User-Agent': 'CloudBase-Proxy/1.0' },
              timeout: 30000
            }, (res) => {
              if (res.statusCode !== 200) {
                reject(new Error(`下载失败，状态码: ${res.statusCode}`));
                return;
              }
              const chunks = [];
              res.on('data', chunk => chunks.push(chunk));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            }).on('error', reject).on('timeout', () => reject(new Error('下载超时')));
          });
          
          const sizeMB = fileBuffer.length / (1024 * 1024);
          console.log('[db-init] proxyDownload 文件大小:', sizeMB.toFixed(2), 'MB');
          
          // ★ 文件过大时拒绝代理下载（避免超时和内存溢出）
          if (sizeMB > 10) {
            result = {
              code: 413,
              message: `文件过大(${sizeMB.toFixed(1)}MB)，请在浏览器中打开`,
              data: { url: downloadUrl, size: sizeMB }
            };
            break;
          }
          
          // 3. 返回 base64 编码的文件内容
          const base64 = fileBuffer.toString('base64');
          result = {
            code: 0,
            data: {
              base64: base64,
              fileName: fileId.split('/').pop() || 'file.pdf',
              size: fileBuffer.length
            }
          };
        } catch (err) {
          console.error('[db-init] proxyDownload 错误:', err);
          result = { code: 500, message: err.message || '代理下载失败' };
        }
        break;
      }
        
      case 'migrateSourceId': {
        // ★ 统一迁移：将所有集合中的 sourceId 从 UUID 格式转为体系 code
        // 背景：管理后台创建分类时下拉框存了 source._id（UUID），但种子数据存的是 code
        // 统一为 code（如 "CAAC"/"RENSHE"），确保所有查询都能用 code 匹配
        const stats = { sources: 0, categories: 0, courses: 0, classes: 0, page_configs: 0, errors: [] };
        
        try {
          // 1. 查询所有体系，构建 UUID → code 映射表
          const sourcesResult = await db.collection('sources').get();
          const sources = sourcesResult.data || [];
          const uuidToCode = new Map();
          const knownCodes = new Set();
          
          for (const s of sources) {
            knownCodes.add(s.code);
            if (s._id && s.code && s._id !== s.code) {
              uuidToCode.set(s._id, s.code); // UUID → code
            }
            if (s.code) {
              uuidToCode.set(s.code, s.code); // code → code（幂等）
            }
          }
          stats.sources = sources.length;
          console.log('[migrateSourceId] 体系映射表:', JSON.stringify([...uuidToCode.entries()]));
          
          // 如果没有任何 UUID 需要迁移（所有 source._id === code），直接返回
          if (uuidToCode.size === knownCodes.size) {
            result = { code: 0, message: '无需迁移，所有体系的 _id 与 code 一致', data: { stats, note: '种子数据格式已统一' } };
            break;
          }
          
          // 2. 迁移各集合
          const collections = ['categories', 'courses', 'classes', 'page_configs'];
          
          for (const collName of collections) {
            try {
              const collResult = await db.collection(collName).limit(500).get();
              const docs = collResult.data || [];
              let migratedCount = 0;
              
              for (const doc of docs) {
                const currentSourceId = doc.sourceId || (doc.data && doc.data.sourceId);
                
                // 跳过已经是 code 格式的记录
                if (!currentSourceId || knownCodes.has(currentSourceId)) continue;
                
                // 查找对应的 code
                const targetCode = uuidToCode.get(currentSourceId);
                if (!targetCode) {
                  console.warn(`[migrateSourceId] ${collName}:${doc._id} 无法解析 sourceId=${currentSourceId}`);
                  stats.errors.push(`${collName}:${doc._id} - sourceId=${currentSourceId} 无匹配体系`);
                  continue;
                }
                
                // 更新 sourceId 为 code
                if (collName === 'page_configs') {
                  // page_configs 的结构不同：sourceId 在 config.data 中
                  await db.collection(collName).doc(doc._id).update({
                    'data.sourceId': targetCode
                  });
                } else {
                  await db.collection(collName).doc(doc._id).update({
                    sourceId: targetCode
                  });
                }
                migratedCount++;
              }
              
              stats[collName] = migratedCount;
              console.log(`[migrateSourceId] ${collName}: 迁移 ${migratedCount} 条`);
            } catch (collErr) {
              console.error(`[migrateSourceId] ${collName} 迁移失败:`, collErr);
              stats.errors.push(`${collName}: ${collErr.message}`);
            }
          }
          
          result = {
            code: 0,
            message: `迁移完成：categories=${stats.categories}, courses=${stats.courses}, classes=${stats.classes}, page_configs=${stats.page_configs}`,
            data: { stats }
          };
        } catch (err) {
          console.error('[migrateSourceId] 迁移失败:', err);
          result = { code: 500, message: err.message, data: { stats } };
        }
        break;
      }
        
      default:
        result = { code: 400, message: `未知的操作: ${action}` };
    }
    
    console.log('[db-init] 返回结果:', JSON.stringify(result));
    return result;
    
  } catch (error) {
    console.error('[db-init] 执行错误:', error);
    return {
      code: -1,
      message: error.message || '执行失败',
      error: error.stack
    };
  }
};
