// frontend/src/components/NotificationToast.tsx
// Production-grade notification system with Toastify
// Handles all Socket.IO real-time events

import React from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

interface NotificationConfig {
  id: string | number;
  event: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  autoClose?: number;
  onClick?: () => void;
}

export class NotificationManager {
  static notify(config: NotificationConfig) {
    const { event, message, type, autoClose = 4000, onClick } = config;

    const commonProps = {
      position: 'top-right' as const,
      autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      onClick,
      className: 'notification-toast',
    };

    switch (type) {
      case 'success':
        toast.success(message, { ...commonProps, icon: <CheckCircle className="w-5 h-5" /> });
        break;
      case 'error':
        toast.error(message, { ...commonProps, icon: <AlertCircle className="w-5 h-5" /> });
        break;
      case 'warning':
        toast.warning(message, { ...commonProps, icon: <Zap className="w-5 h-5" /> });
        break;
      case 'info':
      default:
        toast.info(message, { ...commonProps, icon: <Info className="w-5 h-5" /> });
    }
  }

  static success(message: string, options?: Partial<NotificationConfig>) {
    this.notify({ id: Date.now(), event: 'success', message, type: 'success', ...options });
  }

  static error(message: string, options?: Partial<NotificationConfig>) {
    this.notify({ id: Date.now(), event: 'error', message, type: 'error', ...options });
  }

  static warning(message: string, options?: Partial<NotificationConfig>) {
    this.notify({ id: Date.now(), event: 'warning', message, type: 'warning', ...options });
  }

  static info(message: string, options?: Partial<NotificationConfig>) {
    this.notify({ id: Date.now(), event: 'info', message, type: 'info', ...options });
  }
}

/**
 * Request-specific notifications
 */
export const RequestNotifications = {
  accepted: (helperName: string, estimatedMin?: number) => {
    NotificationManager.success(
      `✅ ${helperName} accepted your request${estimatedMin ? ` - ${estimatedMin} min away` : ''}`,
      { autoClose: 5000 }
    );
  },

  inProgress: (helperName: string) => {
    NotificationManager.info(`🚀 ${helperName} is on the way`, { autoClose: 4000 });
  },

  completed: (helperName: string) => {
    NotificationManager.success(
      `✨ Service completed! Please rate ${helperName}`,
      { autoClose: 6000 }
    );
  },

  reassigned: (attempt: number) => {
    NotificationManager.info(
      `🔄 Looking for a new helper (Attempt ${attempt}/3)`,
      { autoClose: 3000 }
    );
  },

  autoExpired: () => {
    NotificationManager.error(
      '⏱️ No helpers available. Request expired. Please try again.',
      { autoClose: 5000 }
    );
  },

  cancelled: () => {
    NotificationManager.warning('Request cancelled', { autoClose: 3000 });
  },

  message: (senderName: string, preview: string) => {
    NotificationManager.info(
      `💬 ${senderName}: ${preview}`,
      { autoClose: 5000 }
    );
  },

  helperAvailable: () => {
    NotificationManager.success(
      '🟢 You are now online and can receive requests',
      { autoClose: 3000 }
    );
  },

  helperUnavailable: () => {
    NotificationManager.warning(
      '🔴 You are now unavailable for new requests',
      { autoClose: 3000 }
    );
  },
};

interface NotificationToastProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark' | 'colored';
}

/**
 * NotificationToast Component
 * Global notification system container
 * Place once in App.tsx
 */
export const NotificationToast: React.FC<NotificationToastProps> = ({
  position = 'top-right',
  theme = 'light',
}) => {
  return (
    <ToastContainer
      position={position}
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme}
      limit={4}
      className="toast-container"
      toastClassName={() =>
        `relative flex p-3 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer text-sm font-medium flex items-center gap-3`
      }
      progressClassName="toastProgress"
    />
  );
};

export default NotificationToast;
