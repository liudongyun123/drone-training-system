/**
 * db-init 云函数 - 简化版
 * 确保基础功能稳定运行
 */

'use strict';

const cloud = require('wx-server-sdk');

// 使用固定环境ID初始化
cloud.init({
  env: 'rcwljy-5ghmq2ex26764978'
});

const db = cloud.database();
const _ = db.command;

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
    
    const { action, collection, id, data, query, where, skip, limit, orderBy, order } = params;
    
    console.log('[db-init] action:', action, 'collection:', collection);
    
    let result;
    
    switch (action) {
      case 'ping':
        result = { code: 0, message: 'pong', timestamp: new Date().toISOString() };
        break;
        
      case 'query':
      case 'getList': {
        const whereConditions = query || where || {};
        let coll = db.collection(collection);
        
        if (Object.keys(whereConditions).length > 0) {
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
        
        const addResult = await db.collection(collection).add({ data: insertData });
        result = { code: 0, data: { id: addResult._id }, message: '添加成功' };
        break;
      }
        
      case 'update': {
        const updateData = {
          ...data,
          updatedAt: new Date().toISOString()
        };
        delete updateData._id;
        delete updateData._openid;
        delete updateData.createdAt;
        
        const updateResult = await db.collection(collection).doc(id).update({ data: updateData });
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
        const countConditions = query || where || {};
        let countColl = db.collection(collection);
        
        if (Object.keys(countConditions).length > 0) {
          countColl = countColl.where(countConditions);
        }
        
        const countResult = await countColl.count();
        result = { code: 0, total: countResult.total };
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
