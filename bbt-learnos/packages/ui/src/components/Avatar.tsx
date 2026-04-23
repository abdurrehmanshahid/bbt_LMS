import * as React from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '../utils/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, name, size = 'md', className }) => (
  <RadixAvatar.Root
    className={cn(
      'relative flex shrink-0 overflow-hidden rounded-full',
      sizeClasses[size],
      className,
    )}
  >
    {src && (
      <RadixAvatar.Image
        src={src}
        alt={alt ?? name ?? 'Avatar'}
        className="h-full w-full object-cover"
      />
    )}
    <RadixAvatar.Fallback
      className="flex h-full w-full items-center justify-center rounded-full bg-indigo-600 font-body font-semibold text-white"
      delayMs={src ? 600 : 0}
    >
      {getInitials(name)}
    </RadixAvatar.Fallback>
  </RadixAvatar.Root>
);

Avatar.displayName = 'Avatar';
