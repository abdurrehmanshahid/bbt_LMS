import * as React from 'react';
import { cn } from '../utils/cn';

export type InputVariant = 'default' | 'error' | 'success';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  helpText?: string;
  errorMessage?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const variantRing: Record<InputVariant, string> = {
  default: 'border-navy-200 dark:border-navy-600 focus:ring-indigo-500 focus:border-indigo-500',
  error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
  success: 'border-green-500 focus:ring-green-500 focus:border-green-500',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', label, helpText, errorMessage, leftAddon, rightAddon, className, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    const helpId = `${inputId}-help`;
    const errorId = `${inputId}-error`;
    const activeVariant = errorMessage ? 'error' : variant;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-navy-800 dark:text-white">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <span className="absolute left-3 text-navy-400 dark:text-navy-300 pointer-events-none" aria-hidden="true">
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={errorMessage ? errorId : helpText ? helpId : undefined}
            aria-invalid={!!errorMessage}
            className={cn(
              'w-full rounded-md border bg-white dark:bg-navy-800 text-navy-900 dark:text-white',
              'px-3 py-2 text-sm font-body placeholder:text-navy-400',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:pointer-events-none disabled:opacity-50',
              variantRing[activeVariant],
              leftAddon && 'pl-9',
              rightAddon && 'pr-9',
              className,
            )}
            {...props}
          />
          {rightAddon && (
            <span className="absolute right-3 text-navy-400 dark:text-navy-300 pointer-events-none" aria-hidden="true">
              {rightAddon}
            </span>
          )}
        </div>
        {errorMessage && (
          <p id={errorId} className="text-xs text-red-500" role="alert">
            {errorMessage}
          </p>
        )}
        {!errorMessage && helpText && (
          <p id={helpId} className="text-xs text-navy-500 dark:text-navy-300">
            {helpText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
