/**
 * 数据修复工具
 * 统一课程、排课、报名的关联关系
 */
import { useState } from 'react'
import { app } from '@/utils/cloudbase'

// 云函数调用
async function callFunction(action: string, data: any = {}) {
  const result = await app.callFunction({
    name: 'admin',
    data: { ...data, action }
  })
  return result.result
}

interface FixResult {
  collection: string
  total: number
  updated: number
  errors: any[]
}

export default function AdminDataFix() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FixResult[]>([])
  const [log, setLog] = useState<string[]>([])
  const [step, setStep] = useState(0)

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // 步骤1: 获取所有课程，建立映射表
  const buildCourseMap = async () => {
    addLog('📋 步骤1: 构建课程映射表...')
    try {
      const result: any = await callFunction('list', {
        collection: 'courses',
        query: {},
        options: { limit: 1000 }
      })
      
      if (result.code !== 0 || !result.data) {
        addLog('❌ 获取课程列表失败')
        return null
      }

      const courseMap: Record<string, string> = {}
      const courses = result.data
      
      courses.forEach((course: any) => {
        // 以 _id 为标准
        courseMap[course._id] = course._id
        courseMap[course.title] = course._id
        
        // 支持 course_001 格式
        const match = course._id.match(/course_(\d+)/)
        if (match) {
          const num = parseInt(match[1])
          courseMap[`course_${num}`] = course._id
          courseMap[`course_${num.toString().padStart(2, '0')}`] = course._id
          courseMap[`course_${num.toString().padStart(3, '0')}`] = course._id
        }
      })

      // 添加常见别名
      const aliases: Record<string, string> = {
        '多旋翼基础': 'course_001',
        '多旋翼飞行': 'course_001',
        '航拍技巧': 'course_003',
        '航拍技巧进阶': 'course_003',
        '固定翼飞行': 'course_002',
        '固定翼飞行入门': 'course_002',
        '维修保养': 'course_004',
        '无人机维修培训': 'course_004',
      }
      Object.assign(courseMap, aliases)

      addLog(`✅ 课程映射表构建完成，共 ${courses.length} 个课程`)
      return courseMap
    } catch (error: any) {
      addLog(`❌ 步骤1失败: ${error.message}`)
      return null
    }
  }

  // 步骤2: 修复排课表
  const fixSchedules = async (courseMap: Record<string, string>) => {
    addLog('📋 步骤2: 修复排课表...')
    try {
      const result: any = await callFunction('list', {
        collection: 'course_schedules',
        query: {},
        options: { limit: 1000 }
      })
      
      if (result.code !== 0 || !result.data) {
        addLog('❌ 获取排课列表失败')
        return { total: 0, updated: 0, errors: [] }
      }

      const schedules = result.data
      let updated = 0
      const errors: any[] = []

      for (const schedule of schedules) {
        let correctCourseId = null

        // 方式1: 通过 courseName 匹配
        if (schedule.courseName) {
          correctCourseId = courseMap[schedule.courseName]
        }

        // 方式2: 通过 courseId 数字匹配
        if (!correctCourseId && schedule.courseId) {
          correctCourseId = courseMap[schedule.courseId]
          // 尝试提取数字
          if (!correctCourseId) {
            const match = schedule.courseId.match(/course_(\d+)/)
            if (match) {
              const num = parseInt(match[1])
              correctCourseId = `course_${num.toString().padStart(3, '0')}`
            }
          }
        }

        if (correctCourseId && correctCourseId !== schedule.courseId) {
          try {
            await callFunction('update', {
              collection: 'course_schedules',
              docId: schedule._id,
              data: { courseId: correctCourseId }
            })
            updated++
          } catch (e: any) {
            errors.push({ id: schedule._id, error: e.message })
          }
        } else if (!correctCourseId) {
          errors.push({
            id: schedule._id,
            courseId: schedule.courseId,
            courseName: schedule.courseName,
            error: '无法匹配课程'
          })
        }
      }

      addLog(`✅ 排课表修复完成: 更新 ${updated}/${schedules.length} 条`)
      if (errors.length > 0) {
        addLog(`⚠️ ${errors.length} 条无法匹配`)
      }
      
      return { total: schedules.length, updated, errors: errors.slice(0, 10) }
    } catch (error: any) {
      addLog(`❌ 步骤2失败: ${error.message}`)
      return { total: 0, updated: 0, errors: [] }
    }
  }

  // 步骤3: 修复报名表
  const fixEnrollments = async (courseMap: Record<string, string>) => {
    addLog('📋 步骤3: 修复报名表...')
    try {
      const result: any = await callFunction('list', {
        collection: 'enrollments',
        query: {},
        options: { limit: 1000 }
      })
      
      if (result.code !== 0 || !result.data) {
        addLog('❌ 获取报名列表失败')
        return { total: 0, updated: 0, errors: [] }
      }

      const enrollments = result.data
      let updated = 0
      const errors: any[] = []

      for (const enrollment of enrollments) {
        let correctCourseId = null

        // 方式1: 通过 scheduleId 查找排课
        if (enrollment.scheduleId) {
          const scheduleResult: any = await callFunction('list', {
            collection: 'course_schedules',
            query: { _id: enrollment.scheduleId },
            options: { limit: 1 }
          })
          if (scheduleResult.code === 0 && scheduleResult.data && scheduleResult.data.length > 0) {
            correctCourseId = scheduleResult.data[0].courseId
          }
        }

        // 方式2: 通过 courseName 匹配
        if (!correctCourseId && enrollment.courseName) {
          correctCourseId = courseMap[enrollment.courseName]
        }

        // 方式3: 数字匹配
        if (!correctCourseId && enrollment.courseId) {
          correctCourseId = courseMap[enrollment.courseId]
        }

        if (correctCourseId) {
          try {
            await callFunction('update', {
              collection: 'enrollments',
              docId: enrollment._id,
              data: { courseId: correctCourseId }
            })
            updated++
          } catch (e: any) {
            errors.push({ id: enrollment._id, error: e.message })
          }
        } else {
          errors.push({
            id: enrollment._id,
            scheduleId: enrollment.scheduleId,
            courseName: enrollment.courseName,
            error: '无法匹配课程'
          })
        }
      }

      addLog(`✅ 报名表修复完成: 更新 ${updated}/${enrollments.length} 条`)
      if (errors.length > 0) {
        addLog(`⚠️ ${errors.length} 条无法匹配`)
      }
      
      return { total: enrollments.length, updated, errors: errors.slice(0, 10) }
    } catch (error: any) {
      addLog(`❌ 步骤3失败: ${error.message}`)
      return { total: 0, updated: 0, errors: [] }
    }
  }

  // 步骤4: 修复订单表
  const fixOrders = async (courseMap: Record<string, string>) => {
    addLog('📋 步骤4: 修复订单表...')
    try {
      const result: any = await callFunction('list', {
        collection: 'orders',
        query: {},
        options: { limit: 1000 }
      })
      
      if (result.code !== 0 || !result.data) {
        addLog('❌ 获取订单列表失败')
        return { total: 0, updated: 0, errors: [] }
      }

      const orders = result.data
      let updated = 0
      const errors: any[] = []

      for (const order of orders) {
        // 跳过新格式订单
        if (order.items && order.items.length > 0) {
          continue
        }

        let correctCourseId = null

        // 方式1: 通过 courseName 匹配
        if (order.courseName) {
          correctCourseId = courseMap[order.courseName]
        }

        // 方式2: 数字匹配
        if (!correctCourseId && order.courseId) {
          correctCourseId = courseMap[order.courseId]
          if (!correctCourseId) {
            const match = order.courseId.match(/course_(\d+)/)
            if (match) {
              const num = parseInt(match[1])
              correctCourseId = `course_${num.toString().padStart(3, '0')}`
            }
          }
        }

        if (correctCourseId) {
          try {
            await callFunction('update', {
              collection: 'orders',
              docId: order._id,
              data: { courseId: correctCourseId }
            })
            updated++
          } catch (e: any) {
            errors.push({ id: order._id, error: e.message })
          }
        } else if (order.courseId) {
          errors.push({
            id: order._id,
            courseId: order.courseId,
            courseName: order.courseName,
            error: '无法匹配课程'
          })
        }
      }

      addLog(`✅ 订单表修复完成: 更新 ${updated} 条`)
      if (errors.length > 0) {
        addLog(`⚠️ ${errors.length} 条无法匹配`)
      }
      
      return { total: orders.length, updated, errors: errors.slice(0, 10) }
    } catch (error: any) {
      addLog(`❌ 步骤4失败: ${error.message}`)
      return { total: 0, updated: 0, errors: [] }
    }
  }

  // 执行修复
  const handleFix = async () => {
    setLoading(true)
    setLog([])
    setResults([])
    setStep(0)

    try {
      // 步骤1: 构建映射表
      setStep(1)
      const courseMap = await buildCourseMap()
      if (!courseMap) {
        setLoading(false)
        return
      }

      // 步骤2: 修复排课表
      setStep(2)
      const scheduleResult = await fixSchedules(courseMap)
      setResults(prev => [...prev, { collection: 'course_schedules', ...scheduleResult }])

      // 步骤3: 修复报名表
      setStep(3)
      const enrollmentResult = await fixEnrollments(courseMap)
      setResults(prev => [...prev, { collection: 'enrollments', ...enrollmentResult }])

      // 步骤4: 修复订单表
      setStep(4)
      const orderResult = await fixOrders(courseMap)
      setResults(prev => [...prev, { collection: 'orders', ...orderResult }])

      addLog('🎉 数据修复全部完成！')
    } catch (error: any) {
      addLog(`❌ 修复失败: ${error.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">数据修复工具</h1>
          <p className="text-slate-400">统一课程、排课、报名的关联关系</p>
        </div>

        {/* 问题说明 */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-3">📌 问题分析</h2>
          <div className="text-slate-300 space-y-2 text-sm">
            <p>• <span className="text-amber-400">courses 表</span>: _id = course_001, course_002...</p>
            <p>• <span className="text-rose-400">course_schedules 表</span>: courseId = course_1_0, course_1_1... (不匹配!)</p>
            <p>• <span className="text-emerald-400">enrollments 表</span>: scheduleId = course_1_0 (对应 course_schedules.courseId)</p>
            <p>• <span className="text-blue-400">orders 表</span>: courseId = course_1, course_2... (不匹配!)</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">开始修复</h2>
              <p className="text-slate-400 text-sm">执行数据关联统一操作</p>
            </div>
            <button
              onClick={handleFix}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  修复中... (步骤 {step}/4)
                </span>
              ) : (
                '🚀 开始修复'
              )}
            </button>
          </div>
        </div>

        {/* 修复进度 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {['构建映射表', '修复排课表', '修复报名表', '修复订单表'].map((name, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border transition-all ${
                step > i
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : step === i + 1
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 animate-pulse'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-2xl mb-1">{step > i ? '✅' : step === i + 1 ? '⏳' : '⬜'}</div>
              <div className="text-sm font-medium">{name}</div>
            </div>
          ))}
        </div>

        {/* 结果汇总 */}
        {results.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">📊 修复结果</h2>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{r.updated > 0 ? '✅' : '➖'}</span>
                    <span className="text-white font-medium">{r.collection}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-semibold">{r.updated}</span>
                    <span className="text-slate-400"> / {r.total}</span>
                    {r.errors.length > 0 && (
                      <span className="ml-3 text-rose-400 text-sm">⚠️ {r.errors.length} 条失败</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 日志输出 */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">📝 执行日志</h2>
          <div className="bg-black/30 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {log.length === 0 ? (
              <div className="text-slate-500">等待执行...</div>
            ) : (
              log.map((line, i) => (
                <div key={i} className={`mb-1 ${line.includes('❌') ? 'text-rose-400' : line.includes('✅') ? 'text-emerald-400' : line.includes('⚠️') ? 'text-amber-400' : 'text-slate-300'}`}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
