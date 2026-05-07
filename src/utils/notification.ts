/**
 * 通知工具
 * 提供统一的用户通知功能
 */
// @ts-ignore
import { message } from 'antd';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

export function showNotification(type: NotificationType, content: string): void {
  // 使用 antd 的 message 组件
  if (typeof message !== 'undefined') {
    message[type](content);
    return;
  }
  // Fallback: 使用原生 alert（仅用于开发环境）
  if (import.meta.env.DEV) {
    console.warn(`[Notification] ${type}: ${content}`);
  }
}

export default { showNotification };
