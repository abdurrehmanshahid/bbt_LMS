import * as Dialog from '@radix-ui/react-dialog';
import * as React from 'react';

import { cn } from '../utils/cn';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className,
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <Dialog.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
          'w-full max-w-lg bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-6',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
          'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
          'focus:outline-none',
          className,
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <Dialog.Title className="text-lg font-display text-navy-900 dark:text-white">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-1 text-sm text-navy-500 dark:text-navy-300">
                {description}
              </Dialog.Description>
            )}
          </div>
          <Dialog.Close
            className="rounded-md p-1 text-navy-500 hover:text-navy-800 dark:text-navy-400 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

Modal.displayName = 'Modal';
