import toast from 'react-hot-toast';

/**
 * Show a success notification
 */
export function showSuccess(message: string) {
  toast.success(message, {
    icon: '✅',
  });
}

/**
 * Show an error notification
 */
export function showError(message: string) {
  toast.error(message, {
    icon: '❌',
  });
}

/**
 * Show an info notification
 */
export function showInfo(message: string) {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
    },
  });
}

/**
 * Show a warning notification
 */
export function showWarning(message: string) {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
    },
  });
}

