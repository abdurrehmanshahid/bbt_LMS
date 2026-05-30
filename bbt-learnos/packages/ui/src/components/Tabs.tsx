import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '../utils/cn';

export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  orientation?: TabsOrientation;
}

export const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ orientation = 'horizontal', className, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
    className={cn(orientation === 'vertical' && 'flex gap-4', className)}
    {...props}
  />
));
Tabs.displayName = 'Tabs';

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { orientation?: TabsOrientation }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'flex gap-1 rounded-xl bg-navy-100 dark:bg-navy-700 p-1',
      orientation === 'vertical' && 'flex-col min-w-[10rem]',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5',
      'text-sm font-body font-medium text-navy-600 dark:text-navy-300 transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-white dark:data-[state=active]:bg-navy-800',
      'data-[state=active]:text-navy-900 dark:data-[state=active]:text-white',
      'data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
