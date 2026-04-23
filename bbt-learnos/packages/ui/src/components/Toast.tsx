import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '../utils/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-green-500 bg-white dark:bg-navy-800',
  error: 'border-red-500 bg-white dark:bg-navy-800',
  warning: 'border-orange-500 bg-white dark:bg-navy-800',
  info: 'border-indigo-500 bg-white dark:bg-navy-800',
};

const iconMap: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport: React.FC = () => (
  <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 p-4 focus:outline-none" />
);

export const Toast: React.FC<ToastProps> = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'info',
  duration = 4000,
}) => (
  <ToastPrimitive.Root
    open={open}
    onOpenChange={onOpenChange}
    duration={duration}
    className={cn(
      'relative flex items-start gap-3 rounded-xl border-l-4 p-4 shadow-lg',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
      'data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
      variantClasses[variant],
    )}
  >
    <span className="shrink-0 mt-0.5">{iconMap[variant]}</span>
    <div className="flex-1 min-w-0">
      <ToastPrimitive.Title className="text-sm font-semibold text-navy-900 dark:text-white">
        {title}
      </ToastPrimitive.Title>
      {description && (
        <ToastPrimitive.Description className="mt-0.5 text-sm text-navy-500 dark:text-navy-300">
          {description}
        </ToastPrimitive.Description>
      )}
    </div>
    <ToastPrimitive.Close
      aria-label="Dismiss"
      className="shrink-0 rounded p-0.5 text-navy-400 hover:text-navy-700 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </ToastPrimitive.Close>
  </ToastPrimitive.Root>
);

Toast.displayName = 'Toast';

// Convenience hook
export function useToast() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    variant?: ToastVariant;
  }>({ open: false, title: '' });

  const toast = React.useCallback(
    (title: string, options?: { description?: string; variant?: ToastVariant }) => {
      setState({ open: true, title, ...options });
    },
    [],
  );

  const dismiss = React.useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return { toast, dismiss, state };
}
