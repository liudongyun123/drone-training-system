"use strict";
const cloudbase = require("@cloudbase/node-sdk");
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || "rcwljy-5ghmq2ex26764978" });
const db = app.database();
const _ = db.command;
const isWxEnv = false;
const CONFIG = {
  APPID: process.env.WX_APPID || "wx25aaf895ab86181a",
  MCH_ID: process.env.WX_MCH_ID || "",
  API_KEY: process.env.WX_API_KEY || "",
  NOTIFY_URL: process.env.WX_NOTIFY_URL || ""
};
const { getCorsHeaders } = require("./lib/cors");
function generateOrderNo() {
  const now = /* @__PURE__ */ new Date();
  const date = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD${date}${random}`;
}
function getOpenId(event) {
  if (isWxEnv) {
    return cloud.getWXContext().OPENID;
  }
  return event.userId || event._openid || "";
}

// ========== 站内消息通知（B5 修复）==========
// 商城下单/支付成功后调用同环境 api-message 云函数写入 messages 集合，
// 保证「商城下单/支付 → 收到站内消息」的端到端闭环。
// api-message 为 Event 类型云函数，使用 Node SDK app.callFunction 同环境调用（已验证可写入 messages）；
// 全程 try/catch，通知失败不影响主流程返回。
async function notifyMessage(action, params) {
  try {
    const res = await app.callFunction({ name: "api-message", data: { action, ...params } });
    console.log("[notifyMessage]", action, JSON.stringify(res).slice(0, 200));
  } catch (e) {
    console.error("[notifyMessage] 通知发送失败(忽略):", action, e && e.message);
  }
}
async function getProducts(params = {}) {
  const { page = 1, pageSize = 20, category = "", keyword = "" } = params;
  let where = { status: "published" };
  if (category && category !== "\u5168\u90E8") where.category = category;
  if (keyword) {
    where.title = db.RegExp({ regexp: keyword, options: "i" });
  }
  const countResult = await db.collection("courses").where(where).count();
  const courses = await db.collection("courses").where(where).orderBy("createdAt", "desc").skip((page - 1) * pageSize).limit(pageSize).get();
  return {
    success: true,
    data: {
      list: courses.data.map((c) => ({
        _id: c._id,
        title: c.title,
        cover: c.cover || c.coverImage,
        price: c.price || 0,
        originalPrice: c.originalPrice || c.price || 0,
        description: c.description?.slice(0, 100) || "",
        category: c.category,
        level: c.level,
        isFree: c.isFree || false
      })),
      total: countResult.total,
      page,
      pageSize
    }
  };
}
async function getCart(data) {
  const phone = data.phone || "";
  const openid = data.userId || data._openid || getOpenId(data);
  if (!phone && !openid) return { success: true, data: [] };
  let cart;
  if (phone) {
    cart = await db.collection("cart").where({ phone }).orderBy("createdAt", "desc").get();
  } else {
    cart = await db.collection("cart").where({ _openid: openid }).orderBy("createdAt", "desc").get();
  }
  if (!cart.data || cart.data.length === 0) {
    return { success: true, data: [] };
  }
  const productIds = cart.data.map((c) => c.productId).filter(Boolean);
  const products = await db.collection("courses").where({ _id: _.in(productIds) }).get();
  const productsMap = {};
  products.data.forEach((p) => {
    productsMap[p._id] = p;
  });
  return {
    success: true,
    data: cart.data.map((item) => ({
      _id: item._id,
      productId: item.productId,
      quantity: item.quantity || 1,
      product: productsMap[item.productId] ? {
        _id: productsMap[item.productId]._id,
        title: productsMap[item.productId].title,
        cover: productsMap[item.productId].cover,
        price: productsMap[item.productId].price || 0
      } : null
    })).filter((item) => item.product)
  };
}
async function addToCart(data) {
  const { productId, quantity = 1, phone = "", userId = "" } = data;
  const openid = userId || getOpenId(data);
  if (!phone && !openid) return { success: false, error: "\u8BF7\u5148\u767B\u5F55" };
  const product = await db.collection("courses").doc(productId).get();
  if (!product.data) return { success: false, error: "\u5546\u54C1\u4E0D\u5B58\u5728" };
  const query = phone ? { phone, productId } : { _openid: openid, productId };
  const existing = await db.collection("cart").where(query).limit(1).get();
  if (existing.data && existing.data.length > 0) {
    await db.collection("cart").doc(existing.data[0]._id).update({
      quantity: _.inc(quantity)
    });
  } else {
    const addData = {
      productId,
      quantity,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (phone) addData.phone = phone;
    if (openid) addData._openid = openid;
    await db.collection("cart").add(addData);
  }
  return { success: true };
}
async function removeFromCart(data) {
  const { itemId, phone = "", userId = "" } = data;
  const openid = userId || getOpenId(data);
  const query = { _id: itemId };
  if (phone) query.phone = phone;
  else if (openid) query._openid = openid;
  await db.collection("cart").where(query).remove();
  return { success: true };
}
async function createOrder(data, userId) {
  const phone = data.phone || "";
  const openid = userId || getOpenId(data);
  const { productId, couponId, quantity = 1 } = data;
  const productIds = Array.isArray(productId) ? productId : [productId];
  if (productIds.length === 0) {
    return { success: false, error: "\u8BF7\u9009\u62E9\u5546\u54C1" };
  }
  const products = await db.collection("courses").where({ _id: _.in(productIds) }).get();
  if (!products.data || products.data.length === 0) {
    return { success: false, error: "\u5546\u54C1\u4E0D\u5B58\u5728" };
  }
  let existingOrders;
  if (phone) {
    existingOrders = await db.collection("orders").where({
      phone,
      status: "paid"
    }).get();
  } else {
    existingOrders = await db.collection("orders").where({
      _openid: openid,
      status: "paid"
    }).get();
  }
  const purchasedIds = new Set(
    existingOrders.data.flatMap(
      (o) => (o.items || []).map((i) => i.courseId || i.productId)
    )
  );
  const validProducts = products.data.filter((p) => !purchasedIds.has(p._id));
  if (validProducts.length === 0) {
    return { success: false, error: "\u5546\u54C1\u5DF2\u8D2D\u4E70" };
  }
  let totalAmount = 0;
  const items = validProducts.map((p) => {
    totalAmount += p.price || 0;
    return {
      courseId: p._id,
      productId: p._id,
      title: p.title,
      price: p.price || 0,
      quantity: 1
    };
  });
  const orderNo = generateOrderNo();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiredAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
  const orderType = data.orderType || "course";
  const order = {
    orderNo,
    orderType,
    type: orderType,
    items,
    totalAmount,
    finalAmount: totalAmount,
    amount: totalAmount,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    expiredAt
  };
  if (phone) {
    order.phone = phone;
  }
  if (openid) {
    order._openid = openid;
    order.userId = openid;
  }
  const result = await db.collection("orders").add(order);
  if (data.clearCart) {
    if (phone) {
      await db.collection("cart").where({ phone }).remove();
    } else {
      await db.collection("cart").where({ _openid: openid }).remove();
    }
  }
  return {
    success: true,
    data: {
      orderId: result.id,
      orderNo,
      totalAmount,
      items,
      expiredAt
    }
  };
}
async function getOrders(params, userId) {
  const phone = params.phone || "";
  const openid = userId || getOpenId(params);
  const { page = 1, pageSize = 10, status = "" } = params;
  let where = {};
  if (phone) {
    where.phone = phone;
  } else if (openid) {
    where._openid = openid;
  }
  if (status) where.status = status;
  const countResult = await db.collection("orders").where(where).count();
  const orders = await db.collection("orders").where(where).orderBy("createdAt", "desc").skip((page - 1) * pageSize).limit(pageSize).get();
  return {
    success: true,
    data: {
      list: orders.data.map((o) => ({
        _id: o._id,
        orderNo: o.orderNo,
        items: o.items,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
        expiredAt: o.expiredAt
      })),
      total: countResult.total,
      page,
      pageSize
    }
  };
}
async function getOrderDetail(orderId, userId) {
  const openid = userId || getOpenId({});
  const order = await db.collection("orders").doc(orderId).get();
  if (!order.data) {
    return { success: false, error: "\u8BA2\u5355\u4E0D\u5B58\u5728" };
  }
  if (order.data._openid !== openid) {
    return { success: false, error: "\u65E0\u6743\u67E5\u770B\u6B64\u8BA2\u5355" };
  }
  return {
    success: true,
    data: {
      _id: order.data._id,
      orderNo: order.data.orderNo,
      items: order.data.items,
      totalAmount: order.data.totalAmount,
      status: order.data.status,
      paymentMethod: order.data.paymentMethod,
      paidAt: order.data.paidAt,
      createdAt: order.data.createdAt,
      expiredAt: order.data.expiredAt
    }
  };
}
async function cancelOrder(orderId, userId) {
  const openid = userId || getOpenId({});
  const order = await db.collection("orders").doc(orderId).get();
  if (!order.data) {
    return { success: false, error: "\u8BA2\u5355\u4E0D\u5B58\u5728" };
  }
  if (order.data._openid !== openid) {
    return { success: false, error: "\u65E0\u6743\u64CD\u4F5C\u6B64\u8BA2\u5355" };
  }
  if (order.data.status !== "pending") {
    return { success: false, error: "\u8BA2\u5355\u72B6\u6001\u4E0D\u5141\u8BB8\u53D6\u6D88" };
  }
  await db.collection("orders").doc(orderId).update({
    status: "cancelled",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return { success: true };
}
async function payOrder(data, userId) {
  const openid = userId || getOpenId({});
  const { orderId, paymentMethod = "mock" } = data;
  const order = await db.collection("orders").doc(orderId).get();
  if (!order.data) {
    return { success: false, error: "\u8BA2\u5355\u4E0D\u5B58\u5728" };
  }
  if (order.data._openid !== openid) {
    return { success: false, error: "\u65E0\u6743\u64CD\u4F5C\u6B64\u8BA2\u5355" };
  }
  if (order.data.status !== "pending") {
    return { success: false, error: "\u8BA2\u5355\u72B6\u6001\u4E0D\u5141\u8BB8\u652F\u4ED8" };
  }
  if (new Date(order.data.expiredAt) < /* @__PURE__ */ new Date()) {
    await db.collection("orders").doc(orderId).update({
      status: "cancelled",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { success: false, error: "\u8BA2\u5355\u5DF2\u8FC7\u671F" };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.collection("orders").doc(orderId).update({
    status: "paid",
    paymentMethod,
    paidAt: now,
    updatedAt: now
  });

  // B5 修复：支付成功后发送站内消息通知
  const paidGoodsName = (order.data.items && order.data.items.length > 0)
    ? order.data.items.map(i => i.title || i.name || "").filter(Boolean).join("、")
    : (order.data.className || "订单");
  await notifyMessage("notifyOrderStatus", {
    phone: order.data.phone,
    orderId,
    status: "paid",
    goodsName: paidGoodsName,
    amount: order.data.finalAmount || order.data.totalAmount || 0
  });

  for (const item of order.data.items || []) {
    const courseId = item.courseId || item.productId;
    if (courseId) {
      const existing = await db.collection("course_permissions").where({ _openid: openid, courseId }).limit(1).get();
      if (!existing.data || existing.data.length === 0) {
        await db.collection("course_permissions").add({
          _openid: openid,
          userId: openid,
          courseId,
          orderId,
          source: "purchase",
          status: "active",
          grantedAt: now,
          createdAt: now
        });
      }
      await db.collection("courses").doc(courseId).update({
        studentCount: _.inc(1)
      });
    }
  }
  return {
    success: true,
    data: {
      orderId,
      orderNo: order.data.orderNo,
      paidAt: now
    }
  };
}
async function getCoupons(userId) {
  const openid = userId || getOpenId({});
  if (!openid) return { success: true, data: [] };
  const coupons = await db.collection("coupons").where({
    _openid: openid,
    status: "unused",
    expiredAt: _.gt((/* @__PURE__ */ new Date()).toISOString())
  }).orderBy("createdAt", "desc").get();
  return {
    success: true,
    data: coupons.data.map((c) => ({
      _id: c._id,
      name: c.name,
      type: c.type,
      value: c.value,
      minAmount: c.minAmount,
      expiredAt: c.expiredAt
    }))
  };
}
async function createShopOrder(data, userId) {
  const order = data.order || data;
  const phone = order.phone || data.phone || "";
  const openid = order.openid || order._openid || userId || "";
  if (!phone && !openid) {
    return { success: false, error: "\u7F3A\u5C11\u7528\u6237\u6807\u8BC6(phone/openid)" };
  }
  if (!order.shopItems || order.shopItems.length === 0) {
    return { success: false, error: "\u8BA2\u5355\u5546\u54C1\u4E0D\u80FD\u4E3A\u7A7A" };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const orderNo = order.orderNo || generateOrderNo();
  const totalAmount = order.totalAmount || 0;
  const discountAmount = order.discountAmount || 0;
  const freight = order.freight || 0;
  const finalAmount = order.finalAmount != null ? order.finalAmount : totalAmount - discountAmount + freight;
  const newOrder = {
    orderNo,
    phone,
    _openid: openid,
    userId: order.userId || openid,
    orderType: "shop",
    type: "shop",
    shopItems: order.shopItems,
    shippingAddress: order.shippingAddress || {},
    remark: order.remark || "",
    totalAmount,
    discountAmount,
    freight,
    finalAmount,
    paymentMethod: order.paymentMethod || "wechat",
    status: order.status || "pending",
    createdAt: now,
    updatedAt: now
  };
  const result = await db.collection("orders").add(newOrder);

  // B5 修复：商城下单成功后发送站内消息通知
  const goodsName = (order.shopItems && order.shopItems.length > 0)
    ? order.shopItems.map(i => i.title || i.name || i.productName || "").filter(Boolean).join("、")
    : "商城订单";
  await notifyMessage("notifyOrderStatus", {
    phone,
    orderId: result.id,
    status: newOrder.status || "pending",
    goodsName,
    amount: finalAmount
  });

  return {
    success: true,
    data: {
      orderId: result.id,
      orderNo,
      finalAmount,
      status: "pending"
    }
  };
}
exports.main = async (event, context) => {
  console.log("[api-shop] \u6536\u5230\u8BF7\u6C42:", event.action);
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: 0, message: "OK" })
    };
  }
  let action = event.action || "";
  let data = event.data || event;
  if (event.body) {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      action = body.action || action;
      data = body.data || body;
    } catch (e) {
    }
  }
  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : "");
  try {
    let result;
    switch (action) {
      // 商品
      case "products":
      case "getProducts":
        result = await getProducts(data);
        break;
      // 购物车
      case "cart":
      case "getCart":
        result = await getCart(userId);
        break;
      case "addToCart":
        result = await addToCart(data.productId, data.quantity, userId);
        break;
      case "removeFromCart":
        result = await removeFromCart(data.itemId, userId);
        break;
      // 订单
      case "createOrder":
        result = await createOrder(data, userId);
        break;
      case "createShopOrder":
        result = await createShopOrder(data, userId);
        break;
      case "orders":
      case "getOrders":
        result = await getOrders(data, userId);
        break;
      case "orderDetail":
      case "getOrderDetail":
        result = await getOrderDetail(data.orderId, userId);
        break;
      case "cancelOrder":
        result = await cancelOrder(data.orderId, userId);
        break;
      case "payOrder":
        result = await payOrder(data, userId);
        break;
      // 优惠券
      case "coupons":
      case "getCoupons":
        result = await getCoupons(userId);
        break;
      default:
        result = { success: false, error: "\u672A\u77E5\u7684\u64CD\u4F5C: " + action };
    }
    if (event.httpMethod || event.headers) {
      return {
        statusCode: result.success ? 200 : 400,
        headers: getCorsHeaders(event.headers?.origin),
        body: JSON.stringify(result)
      };
    }
    return result;
  } catch (error) {
    console.error("[api-shop] \u9519\u8BEF:", error);
    const errorResult = { success: false, error: error.message };
    if (event.httpMethod || event.headers) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(),
        body: JSON.stringify(errorResult)
      };
    }
    return errorResult;
  }
};

// ========== Web 函数模式（WEB_SCF / HTTP 网关 Web 模式）==========
// 云函数以 HTTP(Web) 模式部署时，运行时会执行本文件并期望进程内启动 HTTP 服务监听
// PORT(默认 9000)；网关将请求转发到该服务。这里直接复用上面的 exports.main 业务逻辑，
// 把网关转发的原始 HTTP 请求重新组装成 event 交给 main 处理，再将响应写回。
// 仅当本文件作为主模块被 `node index.js` 启动时（web 模式）才监听端口；
// 事件(Event)模式下运行时直接调用 exports.main，不启动服务。
if (require.main === module) {
  const http = require("http");
  const PORT = process.env.PORT || 9000;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const event = {
          httpMethod: req.method,
          headers: req.headers,
          body: body || undefined
        };
        if (body) {
          try {
            const parsed = JSON.parse(body);
            event.action = parsed.action;
            event.data = parsed.data;
          } catch (e) {
            // 非 JSON body 忽略，交给 main 处理
          }
        }
        const result = await exports.main(event, {});
        const statusCode = (result && result.statusCode) || 200;
        const headers = (result && result.headers) || {
          "Content-Type": "application/json"
        };
        const outBody = result && result.body != null ? result.body : "";
        res.writeHead(statusCode, headers);
        res.end(typeof outBody === "string" ? outBody : JSON.stringify(outBody));
      } catch (err) {
        res.writeHead(500, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  });
  server.listen(PORT, () => {
    console.log("[api-shop] web server listening on :" + PORT);
  });
}
