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
        delete insertData._id;
        delete insertData._openid;
        
        // @cloudbase/node-sdk 直接传入文档对象，不需要 { data: ... } 包装
        const addResult = await db.collection(collection).add(insertData);
        // 服务端 add 返回的 id 字段名可能是 id 或 _id
        const newId = addResult.id || addResult._id || '';
        result = { code: 0, data: { id: newId }, message: '添加成功' };
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
        
        const updateResult = await db.collection(collection).doc(id).update(updateData);
        result = { code: 0, updated: updateResult.updated, message: '更新成功' };
        break;
      }
        
      case 'delete':
      case 'remove': {
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
