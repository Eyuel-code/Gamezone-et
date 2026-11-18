import { useEffect, useState } from 'react';
import { getInitials, isImageAvatar } from '@/utils/avatarUtils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[11px] rounded-lg',
  sm: 'h-9 w-9 text-xs rounded-xl',
  md: 'h-12 w-12 text-sm rounded-xl',
  lg: 'h-16 w-16 text-lg rounded-2xl',
  xl: 'h-20 w-20 text-xl rounded-2xl',
};

export default function UserAvatar({
  src,
  name,
  size = 'sm',
  className = '',
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const sizeCls = SIZE_CLASSES[size];
  const trimmed = (src || '').trim();
  const isImage = isImageAvatar(trimmed) && !imgFailed;

  if (isImage) {
    return (
      <img
        src={trimmed}
        alt={name ? `${name} avatar` : 'User avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeCls} object-cover shrink-0 bg-ink-900 border border-white/10 ${className}`}
      />
    );
  }

  // Handle legacy single-emoji avatars cleanly without breaking img tags, otherwise show crisp initials
  const isShortNonUrl = trimmed.length > 0 && trimmed.length <= 4 && !trimmed.startsWith('data:');
  const label = isShortNonUrl ? trimmed : getInitials(name);

  return (
    <div
      aria-label={name ? `${name} avatar` : 'User avatar'}
      className={`${sizeCls} grid place-items-center shrink-0 bg-gradient-to-br from-primary-500/25 via-ink-800 to-accent-500/25 border border-white/15 font-bold text-white select-none ${className}`}
    >
      <span className={isShortNonUrl ? 'text-base leading-none' : 'tracking-wide'}>
        {label}
      </span>
    </div>
  );
}
