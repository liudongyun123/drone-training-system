/**
 * 日期格式化工具（共享模块）
 */

// 安全的日期解析
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

// 格式化日期为本地字符串
export function formatDateStr(dateStr: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(dateStr);
  if (!date) return '-';
  
  try {
    return date.toLocaleDateString('zh-CN', options || {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return '-';
  }
}

// 格式化完整日期时间
export function formatDateTime(dateStr: string | undefined | null): string {
  const date = parseDate(dateStr);
  if (!date) return '-';
  
  try {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

// 格式化时间
export function formatTime(dateStr: string | undefined | null): string {
  const date = parseDate(dateStr);
  if (!date) return '-';
  
  try {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

// 相对时间（如"2小时前"）
export function getRelativeTime(dateStr: string | undefined | null): string {
  const date = parseDate(dateStr);
  if (!date) return '-';
  
  try {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  } catch {
    return '-';
  }
}
