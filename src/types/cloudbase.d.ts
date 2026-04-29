/**
 * CloudBase JS SDK 类型扩展
 * 解决 SDK 返回值类型推断问题
 */

declare module '@cloudbase/js-sdk' {
  // 扩展数据库查询结果类型
  interface IQueryResult<T = any> {
    data: T[]
    requestId?: string
    total?: number
    limit?: number
    offset?: number
  }

  // 扩展文档查询结果类型
  interface IDocumentResult<T = any> {
    data: T | null
    requestId?: string
  }

  // 扩展计数结果类型
  interface ICountResult {
    total: number
  }

  // 扩展集合方法
  interface ICollection {
    get(): Promise<IQueryResult>
    count(): Promise<ICountResult>
  }

  // 扩展文档方法
  interface IDocument {
    get(): Promise<IDocumentResult>
    update(data: any): Promise<any>
    set(data: any): Promise<any>
    remove(): Promise<any>
  }

  // 扩展查询构建器
  interface IQuery {
    get(): Promise<IQueryResult>
    count(): Promise<ICountResult>
    where(condition: any): IQuery
    orderBy(field: string, order?: 'asc' | 'desc'): IQuery
    limit(count: number): IQuery
    skip(count: number): IQuery
    field(projection: Record<string, boolean>): IQuery
  }
}

// 扩展全局 CloudBase app 类型
declare global {
  interface CloudBaseApp {
    database(): {
      collection(name: string): any
      command: {
        eq: (value: any) => any
        neq: (value: any) => any
        gt: (value: any) => any
        gte: (value: any) => any
        lt: (value: any) => any
        lte: (value: any) => any
        in: (values: any[]) => any
        nin: (values: any[]) => any
        and: (...conditions: any[]) => any
        or: (...conditions: any[]) => any
        not: (condition: any) => any
        exists: (value: boolean) => any
        mod: (divisor: number, remainder: number) => any
        regexp: (pattern: RegExp) => any
      }
    }
  }
}

export {}
