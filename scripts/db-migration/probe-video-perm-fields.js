#!/usr/bin/env node
'use strict'
const DB_INIT_URL = 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'

async function dbInit(action, payload = {}) {
  const res = await fetch(DB_INIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

;(async () => {
  console.log('=== 探查 course_permissions 样本（前5条）===')
  const cp = await dbInit('query', { collection: 'course_permissions', where: {}, limit: 5 })
  const cpList = (cp && cp.data) || []
  console.log('总数(limit返回):', cpList.length)
  cpList.forEach((d, i) => {
    console.log(`\n[${i}] _id=${d._id}`)
    console.log('   phone   =', d.phone || '(空)')
    console.log('   userId  =', d.userId || '(空)')
    console.log('   userName=', d.userName || '(空)')
    console.log('   courseId=', d.courseId || '(空)')
    console.log('   classId =', d.classId || '(空)')
    console.log('   status  =', d.status || '(空)')
    console.log('   videoAccess =', JSON.stringify(d.videoAccess) || '(空/undefined)')
  })

  console.log('\n\n=== 探查 enrollments 样本（前5条）===')
  const en = await dbInit('query', { collection: 'enrollments', where: {}, limit: 5 })
  const enList = (en && en.data) || []
  enList.forEach((d, i) => {
    console.log(`\n[${i}] _id=${d._id}`)
    console.log('   phone       =', d.phone || '(空)')
    console.log('   studentPhone=', d.studentPhone || '(空)')
    console.log('   userId      =', d.userId || '(空)')
    console.log('   studentId   =', d.studentId || '(空)')
    console.log('   studentName =', d.studentName || '(空)')
    console.log('   courseId    =', d.courseId || '(空)')
    console.log('   access      =', JSON.stringify(d.access) || '(空)')
  })
})().catch(e => { console.error(e); process.exit(1) })
