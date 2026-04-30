// ============================================================================
// useConfirm Hook - 替代原生 confirm/alert，返回 Promise
// ============================================================================
import { useState, useCallback, useRef } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

/**
 * 使用 useConfirm 替代原生 confirm
 *
 * @example
 * const { confirm, ConfirmDialog } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({
 *     title: '删除确认',
 *     message: '确定要删除吗？此操作不可恢复。',
 *     variant: 'danger'
 *   });
 *   if (ok) { ... }
 * };
 *
 * // 在 JSX 末尾渲染：
 * return (<div>...<ConfirmDialog /></div>);
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || '确认',
        cancelText: options.cancelText || '取消',
        variant: options.variant || 'info',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog = useCallback(() => {
    if (!state.open) return null;

    const variantStyles = {
      danger: {
        button: 'bg-red-600 hover:bg-red-700 text-white',
        icon: 'text-red-600',
        border: 'border-red-200',
      },
      warning: {
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        icon: 'text-yellow-600',
        border: 'border-yellow-200',
      },
      info: {
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: 'text-blue-600',
        border: 'border-blue-200',
      },
    };

    const style = variantStyles[state.variant || 'info'];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 遮罩 */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleCancel}
        />
        {/* 对话框 */}
        <div className={`relative bg-white rounded-2xl shadow-2xl border ${style.border} max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200`}>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{state.title}</h3>
          <p className="text-sm text-slate-600 mb-6">{state.message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {state.cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${style.button}`}
            >
              {state.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }, [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}

export default useConfirm;
