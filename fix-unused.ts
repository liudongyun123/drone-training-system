/**
 * 自动修复 TS6133 未使用变量/导入
 * 用法: npx tsx fix-unused.ts
 */
import { execSync } from 'child_process'
import * as fs from 'fs'

// 获取所有 TS6133 错误
const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8' })
const errors = output.split('\n').filter(line => line.includes('TS6133'))

interface ErrorInfo {
  file: string
  line: number
  col: number
  varName: string
}

const parsed: ErrorInfo[] = errors.map(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared/)
  if (!match) return null
  return {
    file: match[1],
    line: parseInt(match[2]),
    col: parseInt(match[3]),
    varName: match[4]
  }
}).filter(Boolean) as ErrorInfo[]

console.log(`Found ${parsed.length} TS6133 errors`)

// 按文件分组
const byFile = new Map<string, ErrorInfo[]>()
for (const err of parsed) {
  if (!byFile.has(err.file)) byFile.set(err.file, [])
  byFile.get(err.file)!.push(err)
}

let totalFixed = 0

for (const [file, fileErrors] of byFile) {
  if (!fs.existsSync(file)) continue
  
  let content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  
  // 按行号倒序处理，避免行号偏移
  const sorted = [...fileErrors].sort((a, b) => b.line - a.line)
  
  for (const err of sorted) {
    const lineIdx = err.line - 1
    if (lineIdx >= lines.length) continue
    
    const line = lines[lineIdx]
    
    // 策略1: 如果是 import 行中的变量，移除它
    if (line.includes('import') && line.includes(err.varName)) {
      // 移除变量名
      let newLine = line.replace(new RegExp(`,?\\s*${err.varName}\\s*,?`, 'g'), (match) => {
        // 避免清理时产生空逗号
        return match.startsWith(',') && match.endsWith(',') ? ', ' : match.startsWith(',') ? '' : ''
      })
      // 清理可能的多余逗号和空格
      newLine = newLine.replace(/,\s*,/g, ',').replace(/,\s*\}/g, '\n}')
      if (newLine !== line) {
        lines[lineIdx] = newLine
        totalFixed++
        continue
      }
    }
    
    // 策略2: 如果是 const/let/var 声明，添加 _ 前缀
    const constMatch = line.match(new RegExp(`(const|let|var)\\s+(${err.varName})\\b`))
    if (constMatch) {
      const newLine = line.replace(constMatch[0], `${constMatch[1]} _${constMatch[2]}`)
      lines[lineIdx] = newLine
      totalFixed++
      continue
    }
    
    // 策略3: 如果是解构中的变量，添加 _ 前缀
    const destrMatch = line.match(new RegExp(`(\\{[^}]*)${err.varName}([^}]*\\})`))
    if (destrMatch) {
      const newLine = line.replace(err.varName, `_${err.varName}`)
      lines[lineIdx] = newLine
      totalFixed++
      continue
    }
    
    // 策略4: 注释整行（最后手段）
    if (!line.trim().startsWith('//')) {
      lines[lineIdx] = `// ${line}`
      totalFixed++
    }
  }
  
  fs.writeFileSync(file, lines.join('\n'))
}

console.log(`Fixed ${totalFixed} unused variables/imports`)
