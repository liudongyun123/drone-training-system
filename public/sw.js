/**
 * Service Worker - 支持离线访问
 */

const CACHE_NAME = 'drone-training-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
]

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API请求使用网络优先策略
  if (url.pathname.startsWith('/api/') || url.pathname.includes('cloudbase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 缓存成功的GET请求
          if (request.method === 'GET' && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(() => {
          // 网络失败时尝试从缓存读取
          return caches.match(request).then((cached) => {
            if (cached) return cached
            // 返回离线页面
            if (request.mode === 'navigate') {
              return caches.match('/offline.html')
            }
            throw new Error('Network error')
          })
        })
    )
    return
  }

  // 静态资源使用缓存优先策略
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // 后台更新缓存
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response)
              })
            }
          })
          .catch(() => {})
        return cached
      }

      return fetch(request)
        .then((response) => {
          // 只缓存GET请求且状态码为200的响应
          if (response.status === 200 && request.method === 'GET') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/offline.html')
          }
          throw new Error('Network error')
        })
    })
  )
})

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  // 同步离线数据
  console.log('同步离线数据...')
}

// 推送通知
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || '无人机培训', {
      body: data.body || '您有新的消息',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: data.data,
    })
  )
})

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  )
})
